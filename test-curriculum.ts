import dotenv from 'dotenv';
import { extractJson } from './app/api/llmUtils';
dotenv.config();

async function testNvidiaCurriculum() {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const topic = "Why do leaves change color in autumn?";
  
  const systemPrompt = `You are a Senior Curriculum & Knowledge Graph Architect for ARC (Adaptive Reasoning Model), an adaptive learning system.
Analyze the provided learning material or topic/question and return a STRICT JSON object containing:
1. "topic": string (concise, clear title)
2. "overview": brief summary (1-2 sentences)
3. "concepts": array of 3-5 core concepts extracted from the material:
   - "id": string (e.g. "c1", "c2")
   - "name": concise concept title
   - "description": clear 1-2 sentence concept definition
   - "importance": integer from 1 to 5
   - "confidence": 0.5
4. "prerequisites": array of directed edges:
   - "source": concept ID
   - "target": dependent concept ID
   - "relation": description
5. "questions": array of 3-5 diagnostic questions directly testing these concepts:
   - "id": string (e.g. "q1", "q2")
   - "conceptId": matching concept ID
   - "conceptName": concept name
   - "difficulty": "foundational" | "intermediate" | "advanced"
   - "prompt": specific problem or question to answer
   - "rubricKeyPoints": array of 3 key criteria
   - "sampleSolution": clear reference solution`;

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${nvidiaKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra-550b-a55b',
      messages: [
        { role: 'system', content: 'You are a curriculum architect. Output valid raw JSON only starting with { and ending with }.' },
        { role: 'user', content: `${systemPrompt}\n\nGenerate a structured adaptive curriculum for: "${topic}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500,
    }),
  });

  console.log('NVIDIA status:', response.status);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  console.log('Content preview:', content?.slice(0, 300));
  const parsed = extractJson(content);
  console.log('Parsed successfully! Topic:', parsed.topic, 'Concepts:', parsed.concepts?.length, 'Questions:', parsed.questions?.length);
  console.log('First question prompt:', parsed.questions?.[0]?.prompt);
}

testNvidiaCurriculum();
