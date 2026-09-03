import dotenv from 'dotenv';
dotenv.config();

async function testNvidia() {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  console.log('NVIDIA Key present:', Boolean(nvidiaKey));
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
        messages: [
          { role: 'user', content: 'Say hello in 3 words' },
        ],
        temperature: 0.2,
        max_tokens: 50,
      }),
    });
    console.log('NVIDIA status:', response.status);
    const data = await response.json();
    console.log('NVIDIA data:', data);
  } catch (err: any) {
    console.error('NVIDIA error:', err?.message || err);
  }
}

testNvidia();
