import { DEFAULT_CURRICULA } from '../../../src/data/defaultCurricula';
import { LessonData } from '../../../src/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic: string = body.topic || 'Calculus: Derivatives & Chain Rule';
    const curriculumKey = body.presetKey;

    // If a preset was requested and exists in pre-curated curricula
    if (curriculumKey && DEFAULT_CURRICULA[curriculumKey]) {
      return Response.json(DEFAULT_CURRICULA[curriculumKey]);
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      // Return matching default or dynamically generated structured curriculum
      const matched = Object.values(DEFAULT_CURRICULA).find(
        (c: LessonData) => c.topic.toLowerCase().includes(topic.toLowerCase())
      );
      if (matched) {
        return Response.json(matched);
      }
      return Response.json(generateFallbackCurriculum(topic));
    }

    const systemPrompt = `You are a Senior Curriculum & Knowledge Graph Architect for ARC (Adaptive Reasoning Model), an adaptive learning system.
Analyze the following learning topic and return a STRICT JSON object containing:
1. "topic": string
2. "overview": brief summary (1-2 sentences)
3. "concepts": array of 4-7 concepts, each with:
   - "id": string (e.g. "c1", "c2")
   - "name": concise title
   - "description": clear 1-2 sentence concept definition
   - "importance": integer from 1 to 5 (5 is most critical)
   - "confidence": 0.5 (initial default)
4. "prerequisites": array of directed edges showing learning flow:
   - "source": prerequisite concept ID (must be learned first)
   - "target": dependent concept ID
   - "relation": short description of the relationship
5. "questions": array of 6-10 questions assessing these concepts:
   - "id": string (e.g. "q1", "q2")
   - "conceptId": matching concept ID
   - "conceptName": concept name
   - "difficulty": "foundational" | "intermediate" | "advanced"
   - "prompt": specific problem requiring algebraic or step-by-step reasoning
   - "rubricKeyPoints": array of key criteria for evaluation
   - "sampleSolution": brief reference solution
   - "isPrerequisiteCheck": boolean (true for foundational/diagnostic questions)
   - "targetPrerequisiteOf": optional target concept ID if this question tests a prerequisite

Respond with valid JSON ONLY. Do NOT wrap in markdown code fences.`;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a structured adaptive curriculum for: "${topic}"` },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('NVIDIA API returned error for analyze-lesson:', errText);
      return Response.json(generateFallbackCurriculum(topic));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Clean potential markdown blocks
    const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      const parsed: LessonData = JSON.parse(cleaned);
      // Ensure all initial confidences are 0.5
      parsed.concepts = parsed.concepts.map(c => ({
        ...c,
        confidence: 0.5,
        importance: Math.min(5, Math.max(1, Number(c.importance) || 3)),
      }));
      return Response.json(parsed);
    } catch (parseError) {
      console.warn('Could not parse model response as JSON:', parseError, content);
      return Response.json(generateFallbackCurriculum(topic));
    }
  } catch (error) {
    console.error('Error in analyze-lesson route:', error);
    return Response.json(
      { error: 'Failed to analyze lesson topic', details: String(error) },
      { status: 500 }
    );
  }
}

function generateFallbackCurriculum(topic: string): LessonData {
  return {
    topic: topic || 'Linear Algebra & Matrix Transformations',
    overview: `Explore core structures, linear maps, and eigenvalues in ${topic}.`,
    concepts: [
      {
        id: 'c-foundations',
        name: 'Foundational Vectors & Spaces',
        description: 'Linear combinations, span, and basis vectors in Euclidean space.',
        importance: 4,
        confidence: 0.5,
      },
      {
        id: 'c-transformations',
        name: 'Linear Transformations & Matrices',
        description: 'Mapping vectors through matrix multiplication T(x) = Ax preserving addition and scalar multiplication.',
        importance: 5,
        confidence: 0.5,
      },
      {
        id: 'c-determinants',
        name: 'Determinants & Invertibility',
        description: 'Volume scaling factor det(A), matrix rank, and condition for non-singularity.',
        importance: 3,
        confidence: 0.5,
      },
      {
        id: 'c-eigenvalues',
        name: 'Eigenvalues & Eigenvectors',
        description: 'Invariant directions satisfying Av = lambda*v under transformation A.',
        importance: 5,
        confidence: 0.5,
      },
      {
        id: 'c-diagonalization',
        name: 'Matrix Diagonalization & Applications',
        description: 'Decomposition A = P D P^(-1) for decoupling dynamical systems and powers of matrices.',
        importance: 4,
        confidence: 0.5,
      },
    ],
    prerequisites: [
      { source: 'c-foundations', target: 'c-transformations', relation: 'Basis vectors define transformations' },
      { source: 'c-transformations', target: 'c-determinants', relation: 'Determinant measures transformation scaling' },
      { source: 'c-transformations', target: 'c-eigenvalues', relation: 'Eigen analysis describes invariant axes' },
      { source: 'c-determinants', target: 'c-eigenvalues', relation: 'Characteristic polynomial det(A - lambda*I) = 0' },
      { source: 'c-eigenvalues', target: 'c-diagonalization', relation: 'Eigenbasis forms diagonalizing matrix P' },
    ],
    questions: [
      {
        id: 'q-la-1',
        conceptId: 'c-foundations',
        conceptName: 'Foundational Vectors & Spaces',
        difficulty: 'foundational',
        prompt: 'Determine whether the vectors v1 = [1, 2] and v2 = [2, 4] are linearly independent. Explain your reasoning.',
        rubricKeyPoints: ['Check if v2 is a scalar multiple of v1 (v2 = 2 * v1)', 'Conclude they are linearly dependent'],
        sampleSolution: 'Since v2 = 2 * v1, the vectors are scalar multiples and therefore linearly dependent.',
        isPrerequisiteCheck: true,
        targetPrerequisiteOf: 'c-transformations',
      },
      {
        id: 'q-la-2',
        conceptId: 'c-transformations',
        conceptName: 'Linear Transformations & Matrices',
        difficulty: 'intermediate',
        prompt: 'Given matrix A = [[2, 1], [0, 3]], compute the transformation of vector x = [4, -1].',
        rubricKeyPoints: ['Multiply row 1: 2(4) + 1(-1) = 7', 'Multiply row 2: 0(4) + 3(-1) = -3', 'Result is [7, -3]'],
        sampleSolution: 'A*x = [2(4)+1(-1), 0(4)+3(-1)] = [7, -3].',
      },
      {
        id: 'q-la-3',
        conceptId: 'c-determinants',
        conceptName: 'Determinants & Invertibility',
        difficulty: 'foundational',
        prompt: 'Calculate the determinant of matrix M = [[3, 2], [1, 4]]. Is M invertible?',
        rubricKeyPoints: ['det(M) = ad - bc = (3)(4) - (2)(1) = 12 - 2 = 10', 'Since det(M) ≠ 0, M is invertible'],
        sampleSolution: 'det(M) = 3*4 - 2*1 = 10. Because det(M) ≠ 0, M is invertible.',
        isPrerequisiteCheck: true,
        targetPrerequisiteOf: 'c-eigenvalues',
      },
      {
        id: 'q-la-4',
        conceptId: 'c-eigenvalues',
        conceptName: 'Eigenvalues & Eigenvectors',
        difficulty: 'advanced',
        prompt: 'Find the eigenvalues of A = [[4, 2], [1, 3]] by solving det(A - lambda*I) = 0.',
        rubricKeyPoints: [
          'Characteristic equation: (4 - lambda)(3 - lambda) - 2 = 0',
          'lambda^2 - 7lambda + 12 - 2 = lambda^2 - 7lambda + 10 = 0',
          'Factor: (lambda - 5)(lambda - 2) = 0',
          'Eigenvalues: lambda1 = 5, lambda2 = 2',
        ],
        sampleSolution: 'det(A - λI) = (4-λ)(3-λ) - 2 = λ^2 - 7λ + 10 = (λ-5)(λ-2) = 0. Eigenvalues are λ = 5 and λ = 2.',
      },
      {
        id: 'q-la-5',
        conceptId: 'c-diagonalization',
        conceptName: 'Matrix Diagonalization & Applications',
        difficulty: 'advanced',
        prompt: 'If a 2x2 matrix has eigenvalues 5 and 2 with independent eigenvectors, describe how to construct matrix P such that A = P D P^(-1).',
        rubricKeyPoints: [
          'Form columns of P using the eigenvectors v1 and v2 corresponding to 5 and 2',
          'Set D = [[5, 0], [0, 2]]',
        ],
        sampleSolution: 'P is constructed with the eigenvectors as its columns: P = [v1 | v2]. Then D = diag(5, 2) and A = P D P^(-1).',
      },
    ],
  };
}
