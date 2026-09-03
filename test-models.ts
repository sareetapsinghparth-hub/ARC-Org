import dotenv from 'dotenv';
dotenv.config();

async function testFastModels() {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const models = [
    'meta/llama-3.3-70b-instruct',
    'mistralai/mistral-large-2-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct',
  ];

  for (const m of models) {
    const start = Date.now();
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Say hello in 3 words' }],
          max_tokens: 20,
        }),
      });
      const ms = Date.now() - start;
      console.log(`Model ${m}: status ${res.status}, time: ${ms}ms`);
    } catch (e: any) {
      console.log(`Model ${m} failed:`, e?.message);
    }
  }
}

testFastModels();
