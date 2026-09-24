import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import pdfParse from 'pdf-parse';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const processResumeUpload = async (req, res) => {
  try {
    const { userId, fileName } = req.body;

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(fileName);
    if (downloadError) throw new Error("Failed to download file.");

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfContent = await pdfParse(buffer);
    const rawText = pdfContent.text;

const prompt = `Extract professional data from this resume: ${rawText}`;
const jsonResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
         responseMimeType: "application/json",
         systemInstruction: 'Return strictly a JSON object with keys: "skills" (array of strings), "education" (array of objects with "degree", "school", "year"), and "experience" (array of objects with "title", "company", "startDate", "endDate", "responsibilities" as an array of strings).'
    }
});
    const extractedData = JSON.parse(jsonResponse.text);

    const embeddingModel = ai.getGenerativeModel({ model: "text-embedding-004"});
    const embeddingResult = await embeddingModel.embedContent(rawText);
    const vectorArray = embeddingResult.embedding.values;

const { error: updateError } = await supabase
  .from('candidate_profiles') 
  .update({
     skills: extractedData.skills,
     experience: extractedData.experience,
     education: extractedData.education, 
    resume_embedding: vectorArray,
    resume_status: 'Parsed successfully',
    last_synced: new Date().toISOString()
  })
  .eq('id', userId);
      if (updateError) throw new Error("Database update failed.");

    res.status(200).json({ success: true, data: extractedData, message: "Resume parsed and vectorized." });

  } catch (error) {
    console.error("Parsing Error:", error);
    res.status(500).json({ success: false, error: 'Failed to process resume.' });
  }
};