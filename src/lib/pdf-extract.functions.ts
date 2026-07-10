import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EXTRACT_PROMPT = `You are extracting Previous Year Questions (PYQs) from a JEE (Main or Advanced) PDF.

Return ONLY a JSON object of shape:
{
  "questions": [
    {
      "question": "full question text (LaTeX in \\( ... \\) is fine)",
      "type": "MCQ" | "Numerical",
      "options": ["opt A text", "opt B", "opt C", "opt D"] | null,
      "answer": "A" | "B" | "C" | "D"  (for MCQ)  |  numeric string (for Numerical),
      "year": 2024 | null,
      "session": "Jan 27, Shift 1" | null,
      "difficulty": "Easy" | "Medium" | "Hard" | null
    }
  ]
}

Rules:
- Extract every distinct PYQ you can see. Do not invent questions.
- If a question has 4 options with a marked/known correct answer, type is "MCQ" and answer is one of "A","B","C","D".
- If the answer is a numeric value with no options, type is "Numerical" and options is null.
- Preserve subscripts/superscripts and units in the question text.
- Skip solutions/explanations — only question + correct answer.
- If you cannot determine the correct answer, skip that question.
- Return an empty questions array if the PDF contains no usable PYQs.`;

const ExtractInput = z.object({ uploadId: z.string().uuid() });

interface ExtractedQ {
  question: string;
  type: "MCQ" | "Numerical";
  options: string[] | null;
  answer: string;
  year: number | null;
  session: string | null;
  difficulty: "Easy" | "Medium" | "Hard" | null;
}

export const extractPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ExtractInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { data: upload, error: upErr } = await supabase
      .from("pdf_uploads")
      .select("*")
      .eq("id", data.uploadId)
      .eq("user_id", userId)
      .single();
    if (upErr || !upload) throw new Error("Upload not found");

    await supabase.from("pdf_uploads").update({ status: "processing", error_message: null }).eq("id", upload.id);

    try {
      const { data: fileBlob, error: dlErr } = await supabase.storage
        .from("pyq-pdfs")
        .download(upload.file_path);
      if (dlErr || !fileBlob) throw new Error("Could not download PDF");

      const buf = new Uint8Array(await fileBlob.arrayBuffer());
      // base64 encode
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        binary += String.fromCharCode(...buf.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);

      const body = {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${EXTRACT_PROMPT}\n\nSubject: ${upload.subject}\nChapter: ${upload.chapter}\nExam: ${upload.exam}` },
              {
                type: "file",
                file: {
                  filename: upload.file_name,
                  file_data: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      };

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`AI Gateway ${res.status}: ${errText.slice(0, 500)}`);
      }
      const json = await res.json();
      const text: string = json.choices?.[0]?.message?.content ?? "";
      let parsed: { questions: ExtractedQ[] };
      try {
        parsed = JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("AI did not return JSON");
        parsed = JSON.parse(m[0]);
      }
      const qs = Array.isArray(parsed.questions) ? parsed.questions : [];

      const rows = qs
        .filter((q) => q && q.question && q.answer)
        .map((q) => ({
          user_id: userId,
          upload_id: upload.id,
          subject: upload.subject,
          chapter: upload.chapter,
          exam: upload.exam,
          question: String(q.question).slice(0, 8000),
          options: q.type === "MCQ" && Array.isArray(q.options) ? q.options.slice(0, 4) : null,
          answer: String(q.answer),
          question_type: q.type === "Numerical" ? "Numerical" : "MCQ",
          year: typeof q.year === "number" ? q.year : null,
          session: q.session ?? null,
          difficulty: q.difficulty ?? null,
        }));

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("user_questions").insert(rows);
        if (insErr) throw new Error(`DB insert failed: ${insErr.message}`);
      }

      await supabase
        .from("pdf_uploads")
        .update({ status: "done", question_count: rows.length, updated_at: new Date().toISOString() })
        .eq("id", upload.id);

      return { count: rows.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("pdf_uploads")
        .update({ status: "failed", error_message: msg.slice(0, 500) })
        .eq("id", upload.id);
      throw err;
    }
  });