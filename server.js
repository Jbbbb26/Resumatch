import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email: email, 
    password: password 
  });
  
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  
  res.json({ success: true, data: data });
});
app.post('/api/parse-resume', async (req, res) => {
  const { userId, fileName } = req.body;
  console.log(`Processing file: ${fileName} for user: ${userId}`);

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(fileName);

    if (downloadError) throw new Error(`Supabase Download Error: ${downloadError.message}`);

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const prompt = `
      You are an expert HR parsing AI. Read the attached resume document and extract the data into a strict JSON object. 
      Only return valid JSON, no markdown formatting or extra text.
      
      Required JSON Structure:
      {
        "experience": [
          { "title": "Job Title", "company": "Company Name", "startDate": "YYYY", "endDate": "YYYY", "responsibilities": ["task 1", "task 2"] }
        ],
        "education": [
          { "degree": "Degree Name", "school": "School Name", "year": "YYYY-YYYY" }
        ],
        "skills": ["Skill 1", "Skill 2"]
      }
    `;

    let response;
    let retries = 3;
    let delay = 2000;

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            {
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: "application/pdf"
              }
            },
            prompt
          ],
        });
        break; 
          } catch (error) {
        if (error.status === 503 && retries > 1) {
          console.warn(`Gemini API busy (503). Retrying in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--;
          delay *= 2; 
        } else {
          throw error; 
        }
      }
    }

    let aiResponseText = response.text;
    
    if (aiResponseText.includes('```json')) {
      aiResponseText = aiResponseText.replace(/```json\n?/, '').replace(/\n?```/, '');
    } else if (aiResponseText.includes('```')) {
      aiResponseText = aiResponseText.replace(/```\n?/, '').replace(/\n?```/, '');
    }

    const structuredData = JSON.parse(aiResponseText.trim());
    console.log("Successfully extracted data via Gemini!");

    const textToEmbed = `Skills: ${structuredData.skills?.join(', ')}. Experience: ${JSON.stringify(structuredData.experience)}`;
    
    const embeddingResult = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: textToEmbed 
    });
    const vectorArray = embeddingResult.embeddings[0].values;
    console.log("Successfully vectorized resume data!");
console.log("Payload size:", vectorArray.length, "dimensions");
console.log("Structured Data:", JSON.stringify(structuredData, null, 2));

    const { error: updateError } = await supabase
      .from('candidate_profiles') 
      .update({
        resume_data: structuredData, 
        skills: structuredData.skills, 
        experience: structuredData.experience, 
        resume_embedding: vectorArray, 
        resume_status: 'Parsed successfully',
        last_synced: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (updateError) throw new Error(`Database update failed: ${updateError.message}`);

    res.json({ 
      success: true, 
      data: structuredData,
      message: "Resume parsed and vectorized successfully."
    });

  } catch (error) {
    console.error("Parsing Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend AI Server running on port ${PORT}`));