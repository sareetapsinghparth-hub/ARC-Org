import { DEFAULT_CURRICULA } from '../../../src/data/defaultCurricula';
import { LessonData } from '../../../src/types';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic: string = body.topic || 'Calculus: Derivatives & Chain Rule';
    const curriculumKey = body.presetKey;

    // If a preset was requested and exists in pre-curated curricula
    if (curriculumKey && DEFAULT_CURRICULA[curriculumKey]) {
      return Response.json(DEFAULT_CURRICULA[curriculumKey]);
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const nvidiaKey = process.env.NVIDIA_API_KEY;

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
   - "targetPrerequisiteOf": optional target concept ID if this question tests a prerequisite`;

    // Try Gemini first if available
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Topic: "${topic}". ${systemPrompt}`,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const text = response.text || '';
        const parsed: LessonData = JSON.parse(text);
        parsed.concepts = parsed.concepts.map((c) => ({
          ...c,
          confidence: 0.5,
          importance: Math.min(5, Math.max(1, Number(c.importance) || 3)),
        }));
        return Response.json(parsed);
      } catch (geminiErr) {
        console.warn('Gemini curriculum generation error, trying fallback:', geminiErr);
      }
    }

    // Try NVIDIA if available
    if (nvidiaKey) {
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
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate a structured adaptive curriculum for: "${topic}"` },
            ],
            temperature: 0.2,
            max_tokens: 2500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed: LessonData = JSON.parse(cleaned);
          parsed.concepts = parsed.concepts.map((c) => ({
            ...c,
            confidence: 0.5,
            importance: Math.min(5, Math.max(1, Number(c.importance) || 3)),
          }));
          return Response.json(parsed);
        }
      } catch (nvidiaErr) {
        console.warn('NVIDIA lesson generation error:', nvidiaErr);
      }
    }

    // Check if topic matches one of the rich default curricula
    const matched = Object.values(DEFAULT_CURRICULA).find(
      (c: LessonData) => c.topic.toLowerCase().includes(topic.toLowerCase())
    );
    if (matched) {
      return Response.json(matched);
    }

    return Response.json(generateFallbackCurriculum(topic));
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
      { source: 'c-eigenvalues', target: 'c-diagonalization', relation: 'Eigenbasis diagonalizes matrix operator' },
    ],
    questions: [
      {
        id: 'q-foundations-1',
        conceptId: 'c-foundations',
        conceptName: 'Foundational Vectors & Spaces',
        difficulty: 'foundational',
        prompt: 'Determine whether the vectors v1 = [1, 2, 0], v2 = [0, 1, 1], and v3 = [1, 0, -2] are linearly independent. Show your scalar equation c1*v1 + c2*v2 + c3*v3 = 0 setup and row reduction steps.',
        rubricKeyPoints: [
          'Set up vector equation c1*v1 + c2*v2 + c3*v3 = 0',
          'Form augmented matrix or system of equations',
          'Show row echelon reduction or compute non-zero determinant',
          'Conclude independence or dependence based on pivot positions',
        ],
        sampleSolution: 'Set up matrix [ [1,0,1], [2,1,0], [0,1,-2] ]. Row reduce R2 -> R2 - 2R1: [ [1,0,1], [0,1,-2], [0,1,-2] ]. R3 -> R3 - R2 gives row of zeros: [0, 0, 0]. Free variable exists, so vectors are linearly dependent (v3 = v1 - 2*v2).',
        isPrerequisiteCheck: true,
      },
      {
        id: 'q-transformations-1',
        conceptId: 'c-transformations',
        conceptName: 'Linear Transformations & Matrices',
        difficulty: 'intermediate',
        prompt: 'Find the standard 2x2 matrix for a linear transformation T: R^2 -> R^2 that first reflects vectors across the x-axis, then rotates them counterclockwise by 90 degrees.',
        rubricKeyPoints: [
          'Find image of standard basis vector e1 = [1, 0]',
          'Find image of standard basis vector e2 = [0, 1]',
          'Combine column vectors into transformation matrix [T(e1) T(e2)]',
          'Verify matrix multiplication order',
        ],
        sampleSolution: 'Reflection matrix Rx = [[1, 0], [0, -1]]. Rotation matrix R90 = [[0, -1], [1, 0]]. Composite matrix A = R90 * Rx = [[0, 1], [1, 0]].',
        isPrerequisiteCheck: false,
      },
      {
        id: 'q-determinants-1',
        conceptId: 'c-determinants',
        conceptName: 'Determinants & Invertibility',
        difficulty: 'intermediate',
        prompt: 'Compute the determinant of matrix M = [[3, 2], [1, 4]] and explain geometrically how M scales areas in R^2.',
        rubricKeyPoints: [
          'Use formula det = ad - bc',
          'Calculate 3*4 - 2*1 = 10',
          'Explain that area of any 2D region is scaled by a factor of 10',
          'State orientation is preserved since det > 0',
        ],
        sampleSolution: 'det(M) = (3)(4) - (2)(1) = 12 - 2 = 10. Geometrically, M scales any planar region area by a factor of 10 while preserving orientation (since det > 0).',
        isPrerequisiteCheck: true,
        targetPrerequisiteOf: 'c-eigenvalues',
      },
      {
        id: 'q-eigenvalues-1',
        conceptId: 'c-eigenvalues',
        conceptName: 'Eigenvalues & Eigenvectors',
        difficulty: 'advanced',
        prompt: 'Find the eigenvalues and corresponding eigenvectors for the matrix A = [[4, 1], [2, 3]]. Show your characteristic equation det(A - lambda*I) = 0 steps.',
        rubricKeyPoints: [
          'Set up det([[4-lambda, 1], [2, 3-lambda]]) = 0',
          'Expand characteristic polynomial: lambda^2 - 7*lambda + 10 = 0',
          'Factor into (lambda - 5)(lambda - 2) = 0 to get eigenvalues lambda = 5 and lambda = 2',
          'Solve (A - lambda*I)v = 0 for each eigenvalue to find eigenvector basis',
        ],
        sampleSolution: 'Characteristic polynomial: (4-L)(3-L) - 2 = L^2 - 7L + 10 = (L - 5)(L - 2) = 0. Eigenvalues: lambda1 = 5, lambda2 = 2. For lambda1 = 5: [-1, 1; 2, -2]v = 0 -> v1 = [1, 1]^T. For lambda2 = 2: [2, 1; 2, 1]v = 0 -> v2 = [-1, 2]^T.',
        isPrerequisiteCheck: false,
      },
    ],
  };
}
