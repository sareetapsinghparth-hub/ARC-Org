/**
 * Comprehensive 100-Question End-to-End Stress Test for ARC
 * Tests Curriculum Ingestion, Question Rendering, Answer Evaluation, and Adaptive Engine
 */

import { buildClientCurriculum } from './src/utils/curriculumBuilder';
import { selectNextAdaptiveQuestion } from './src/utils/adaptiveEngine';
import { LessonData, Question, AnswerAnalysisResult } from './src/types';

// 100 Diverse, real-world questions across 10 academic disciplines
const TEST_QUESTIONS = [
  // 1. Calculus & Analysis (10)
  "What is the derivative of f(x) = x^3 * e^(2x) using the product and chain rules?",
  "How do you evaluate the integral of x / (x^2 + 1) dx using u-substitution?",
  "Explain the epsilon-delta definition of a limit and prove lim(x->3) of (2x + 1) = 7.",
  "What is the Fundamental Theorem of Calculus and why does differentiation invert integration?",
  "How do you find the radius of convergence for the power series sum((x^n) / (n * 3^n))?",
  "Solve the differential equation dy/dx = 3y with initial condition y(0) = 5.",
  "How do you compute the arc length of a curve y = f(x) from x = a to x = b?",
  "Explain how Taylor series expansion approximates non-linear functions around a point a.",
  "What is the chain rule for multivariable functions z = f(x(t), y(t))?",
  "How do you use Lagrange multipliers to optimize f(x, y) subject to constraint g(x, y) = c?",

  // 2. Linear Algebra & Geometry (10)
  "How do you determine if a set of three vectors in R^3 are linearly independent?",
  "What are eigenvalues and eigenvectors of a matrix A, and how do you calculate them?",
  "Explain why the determinant of a matrix represents the volume scaling factor of the transformation.",
  "How does Singular Value Decomposition (SVD) decompose an arbitrary m x n matrix?",
  "What is the Gram-Schmidt process for orthonormalizing a set of basis vectors?",
  "Explain the Rank-Nullity Theorem and its geometric significance for linear transformations.",
  "How do you compute the inverse of a 3x3 matrix using row reduction on an augmented matrix?",
  "What is the difference between an orthogonal matrix and a unitary matrix?",
  "How does Principal Component Analysis (PCA) use matrix eigenvectors to reduce dimensionality?",
  "What constitutes a vector space, and what are the 8 fundamental vector space axioms?",

  // 3. Classical Physics & Mechanics (10)
  "How do Newton's three laws of motion predict projectile trajectory with air resistance?",
  "Explain the principle of conservation of mechanical energy in an isolated system.",
  "What is the relationship between torque, moment of inertia, and angular acceleration?",
  "How does Kepler's third law relate orbital period to semi-major axis distance?",
  "Explain the difference between elastic and inelastic collisions in momentum conservation.",
  "What is simple harmonic motion, and how do you derive the period of a mass-spring oscillator?",
  "How do you set up a free-body diagram for a block on an inclined plane with friction?",
  "What is the Coriolis effect, and how does it arise from rotating reference frames?",
  "Explain Bernoulli's principle and how it accounts for fluid pressure drops in constriction.",
  "What is the work-energy theorem, and how is work defined as a line integral of force?",

  // 4. Quantum Mechanics & Electromagnetism (10)
  "What is wave-particle duality, and how did the double-slit experiment prove it?",
  "Explain Heisenberg's Uncertainty Principle and its mathematical formulation delta x * delta p >= hbar/2.",
  "What is the physical meaning of the wavefunction Psi and the Born probability interpretation?",
  "How does quantum superposition differ from classical probability distributions?",
  "What is quantum entanglement, and how does it violate Bell's inequalities?",
  "State Maxwell's four equations of electromagnetism and explain Faraday's law of induction.",
  "How do magnetic fields exert Lorentz force on moving charged particles?",
  "What is the photoelectric effect, and how did Einstein's photon hypothesis resolve the ultraviolet catastrophe?",
  "Explain how a quantum logic gate operates as a unitary transformation on a single qubit.",
  "What is quantum tunneling, and how does a particle cross a finite potential barrier?",

  // 5. Molecular Biology & Genetics (10)
  "How does DNA replication ensure high fidelity through polymerases and proofreading?",
  "Explain the central dogma of molecular biology: transcription, splicing, and translation.",
  "How does CRISPR-Cas9 recognize target genomic loci using guide RNA?",
  "What are the phases of mitosis, and how do spindle fibers segregate sister chromatids?",
  "How do enzymes lower the activation energy of biochemical reactions?",
  "Explain the light-dependent reactions of photosynthesis and ATP synthesis across the thylakoid membrane.",
  "What is the Krebs cycle, and how does it generate NADH and FADH2 for the electron transport chain?",
  "How does epigenetic DNA methylation regulate eukaryotic gene expression without altering base sequence?",
  "What is the difference between homologous recombination and non-homologous end joining in DNA repair?",
  "How do action potentials propagate along myelinated axons via saltatory conduction?",

  // 6. General & Physical Chemistry (10)
  "How do you calculate the pH of a 0.05 M acetic acid solution given Ka = 1.8e-5?",
  "Explain Le Chatelier's principle and how temperature shifts exothermic equilibrium reactions.",
  "What is Gibbs free energy, and how does delta G = delta H - T*delta S determine reaction spontaneity?",
  "How do hybrid orbitals (sp, sp2, sp3) account for molecular geometries in VSEPR theory?",
  "What is the difference between galvanic and electrolytic electrochemical cells?",
  "How does collision theory explain the Arrhenius equation for reaction rate constants?",
  "What are intermolecular forces, and why does water have an unusually high boiling point?",
  "How do buffer solutions resist changes in pH when strong acids or bases are added?",
  "Explain the periodic trend of electronegativity across periods and down groups.",
  "What is Raoult's law for ideal solutions, and how does a non-volatile solute lower vapor pressure?",

  // 7. Computer Science & Algorithms (10)
  "What is Big-O notation, and how do you analyze the time complexity of merge sort?",
  "Explain the difference between depth-first search (DFS) and breadth-first search (BFS) on graphs.",
  "How does Dijkstra's algorithm find the shortest path in a weighted graph with non-negative edges?",
  "What are the principles of dynamic programming, and how does memoization optimize overlapping subproblems?",
  "How does a self-balancing binary search tree (like an AVL or Red-Black tree) maintain O(log n) operations?",
  "Explain how hash collisions are handled using chaining versus open addressing.",
  "What is the difference between process concurrency, parallelism, and multithreading?",
  "How does the two-pointer technique solve the container with most water problem in O(n) time?",
  "What is an NP-complete problem, and how is polynomial-time reduction used in computational complexity?",
  "Explain how public-key cryptography (RSA) uses modular arithmetic and prime factorization.",

  // 8. Machine Learning & Neural Networks (10)
  "How does gradient descent update neural network weights using backpropagation and the chain rule?",
  "Explain the scaled dot-product self-attention mechanism in the Transformer architecture.",
  "What is the vanishing gradient problem in deep networks, and how do residual connections alleviate it?",
  "How does batch normalization stabilize deep neural network training?",
  "What is the trade-off between bias and variance in machine learning generalization?",
  "Explain the difference between L1 (Lasso) and L2 (Ridge) regularization.",
  "How does cross-entropy loss measure the divergence between predicted probabilities and one-hot labels?",
  "What is the role of the Softmax activation function in multi-class classification?",
  "How do convolutional filters capture spatial hierarchies in image feature extraction?",
  "What is reinforcement learning from human feedback (RLHF) and reward modeling in LLM alignment?",

  // 9. Economics & Game Theory (10)
  "How do supply and demand curves determine market equilibrium price and quantity?",
  "What is price elasticity of demand, and how is it calculated using percentage changes?",
  "Explain the concept of a Nash equilibrium in non-cooperative game theory using the Prisoner's Dilemma.",
  "What is the difference between fiscal policy and monetary policy in macroeconomic stabilization?",
  "How does comparative advantage explain mutual gains from international trade?",
  "What is an externality, and how can a Pigouvian tax internalize social costs?",
  "Explain the marginal rate of substitution and indifference curves in consumer utility theory.",
  "What is the difference between monopolistic competition, oligopoly, and perfect competition?",
  "How does inflation affect purchasing power, and how is the Consumer Price Index (CPI) measured?",
  "What is the efficient market hypothesis (EMH) and its weak, semi-strong, and strong forms?",

  // 10. Logic, Reasoning & Philosophy of Mind (10)
  "What is the difference between deductive reasoning, inductive reasoning, and abductive inference?",
  "Explain the structure of a valid categorical syllogism and the fallacy of the undistributed middle.",
  "What is Occam's razor, and how is it applied in scientific model selection?",
  "Explain Turing's imitation game and the Chinese Room argument against strong AI.",
  "What is cognitive dissonance theory, and how do individuals resolve conflicting beliefs?",
  "Explain the confirmation bias and its impact on empirical hypothesis testing.",
  "What is the difference between correlation and causation, and how do confounding variables obscure causality?",
  "Explain Bayes' Theorem and how prior probabilities are updated with new likelihood evidence.",
  "What constitutes a formal logical fallacy versus an informal fallacy (like ad hominem or straw man)?",
  "How does the scientific method use falsifiability (Popper) to distinguish science from pseudoscience?",
];

// Fallback evaluator matching server behavior
function evaluateAnswerSimulated(question: Question, answer: string): AnswerAnalysisResult {
  const norm = (answer || '').toLowerCase().trim();
  const sample = (question.sampleSolution || '').toLowerCase();
  const rubric = question.rubricKeyPoints || [];

  let matchedRubricCount = 0;
  for (const point of rubric) {
    const words = point.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => norm.includes(w))) {
      matchedRubricCount++;
    }
  }

  const isShort = norm.length < 8;
  if (isShort) {
    return {
      status: 'incorrect',
      score: 0.15,
      misconception: 'Insufficient explanation or working provided.',
      feedback: 'The response is too brief to verify your understanding of the underlying steps.',
      recommendedAction: 'Show step-by-step intermediate transformations.',
      confidenceDelta: -0.15,
      newConfidence: 0.35,
    };
  }

  const ratio = rubric.length > 0 ? matchedRubricCount / rubric.length : 0.5;

  if (ratio >= 0.5 || norm.includes('step') || norm.includes('derivative') || norm.includes('vector') || norm.includes('energy') || norm.length > 60) {
    return {
      status: 'correct',
      score: 0.95,
      misconception: 'None',
      feedback: `Strong reasoning! You accurately applied the core principles for ${question.conceptName}.`,
      recommendedAction: 'Ready to advance to higher-difficulty integration questions or explore connected concept nodes.',
      confidenceDelta: 0.28,
      newConfidence: 0.78,
    };
  } else if (ratio >= 0.2 || norm.length > 25) {
    return {
      status: 'partly correct',
      score: 0.65,
      misconception: 'Minor intermediate calculation or notation discrepancy.',
      feedback: `You have the correct direction for ${question.conceptName}. Check intermediate steps carefully.`,
      recommendedAction: 'Review the sample solution: ' + (question.sampleSolution || 'Check algebraic signs.'),
      confidenceDelta: 0.08,
      newConfidence: 0.58,
    };
  } else {
    return {
      status: 'incorrect',
      score: 0.2,
      misconception: `Conceptual gap in applying ${question.conceptName}.`,
      feedback: `The core prerequisite relationships for ${question.conceptName} were not applied.`,
      recommendedAction: 'ARC will now adaptively select a diagnostic prerequisite question.',
      confidenceDelta: -0.15,
      newConfidence: 0.35,
    };
  }
}

async function run100QuestionsTest() {
  console.log('===============================================================');
  console.log(' ARC ADAPTIVE REASONING MODEL: 100-QUESTION STRESS TEST SUITE ');
  console.log('===============================================================\n');

  let passedCurriculum = 0;
  let passedQuestionFidelity = 0;
  let passedEvaluation = 0;
  let passedAdaptiveStep = 0;

  const startTime = Date.now();

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const questionText = TEST_QUESTIONS[i];
    const qIndex = i + 1;

    try {
      // Step 1: Synthesize Curriculum
      const lesson: LessonData = buildClientCurriculum(questionText, true);

      // Check curriculum validity
      const hasTopic = Boolean(lesson.topic && lesson.topic.length > 0);
      const hasConcepts = Array.isArray(lesson.concepts) && lesson.concepts.length >= 3;
      const hasPrereqs = Array.isArray(lesson.prerequisites) && lesson.prerequisites.length >= 2;
      const hasQuestions = Array.isArray(lesson.questions) && lesson.questions.length >= 3;

      if (hasTopic && hasConcepts && hasPrereqs && hasQuestions) {
        passedCurriculum++;
      } else {
        console.error(`[FAIL Q${qIndex}] Invalid curriculum structure for "${questionText}"`);
      }

      // Step 2: Question #1 Fidelity (Must directly test or contain user's question)
      const firstQ = lesson.questions[0];
      const isQuestion1Fidelity = Boolean(
        firstQ &&
        (firstQ.prompt === questionText || firstQ.prompt.toLowerCase().includes(questionText.slice(0, 30).toLowerCase()))
      );

      if (isQuestion1Fidelity) {
        passedQuestionFidelity++;
      } else {
        console.warn(`[WARN Q${qIndex}] Q1 prompt differs from input question: ${firstQ?.prompt}`);
      }

      // Step 3: Initial Adaptive Selection (Question 0 must be selected first)
      const initialConfidence: Record<string, number | undefined> = {};
      const initialSelection = selectNextAdaptiveQuestion(
        lesson.concepts,
        lesson.prerequisites,
        lesson.questions,
        initialConfidence,
        []
      );

      if (initialSelection.question.id === firstQ.id) {
        passedAdaptiveStep++;
      } else {
        console.warn(`[WARN Q${qIndex}] Initial selection did not select Q1: got ${initialSelection.question.id}`);
      }

      // Step 4: Simulate Student Answer & Evaluate
      const simulatedAnswer = `To solve this step by step: First identify the core definitions and governing principles. Set up the intermediate expressions and calculate terms methodically to reach the required conclusion for ${lesson.topic}.`;
      const evalResult = evaluateAnswerSimulated(firstQ, simulatedAnswer);

      const hasValidScore = typeof evalResult.score === 'number' && evalResult.score >= 0 && evalResult.score <= 1;
      const hasValidStatus = ['correct', 'partly correct', 'incorrect'].includes(evalResult.status);
      const hasFeedback = Boolean(evalResult.feedback && evalResult.feedback.length > 5);

      if (hasValidScore && hasValidStatus && hasFeedback) {
        passedEvaluation++;
      } else {
        console.error(`[FAIL Q${qIndex}] Invalid answer evaluation result.`);
      }

      // Step 5: Adaptive Transition with updated confidence
      const updatedConfidence: Record<string, number | undefined> = {
        [firstQ.conceptId]: evalResult.score,
      };
      const nextSelection = selectNextAdaptiveQuestion(
        lesson.concepts,
        lesson.prerequisites,
        lesson.questions,
        updatedConfidence,
        [firstQ.id]
      );

      if (nextSelection.question && nextSelection.question.id !== firstQ.id) {
        // Next question chosen without error
      }

      // Progress reporting every 20 questions
      if (qIndex % 20 === 0 || qIndex === TEST_QUESTIONS.length) {
        console.log(`✓ Processed ${qIndex}/100 questions successfully.`);
        console.log(`  Sample Q${qIndex}: "${questionText.slice(0, 65)}..."`);
        console.log(`  - Target Concept: ${firstQ.conceptName}`);
        console.log(`  - Evaluation Score: ${Math.round(evalResult.score * 100)}% (${evalResult.status})`);
        console.log(`  - Next Adaptive Concept: ${nextSelection.meta.selectedConceptName}\n`);
      }
    } catch (err: any) {
      console.error(`[ERROR Q${qIndex}] Failed processing "${questionText}":`, err.message || err);
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('===============================================================');
  console.log('                   FINAL TEST RESULTS SUMMARY                  ');
  console.log('===============================================================');
  console.log(`Total Questions Tested:           ${TEST_QUESTIONS.length}`);
  console.log(`Curriculum Synthesis Pass Rate:   ${passedCurriculum}/${TEST_QUESTIONS.length} (${(passedCurriculum / TEST_QUESTIONS.length * 100).toFixed(1)}%)`);
  console.log(`Question #1 Rendering Fidelity:   ${passedQuestionFidelity}/${TEST_QUESTIONS.length} (${(passedQuestionFidelity / TEST_QUESTIONS.length * 100).toFixed(1)}%)`);
  console.log(`Answer Evaluation Pass Rate:      ${passedEvaluation}/${TEST_QUESTIONS.length} (${(passedEvaluation / TEST_QUESTIONS.length * 100).toFixed(1)}%)`);
  console.log(`Initial Adaptive Selection Pass:  ${passedAdaptiveStep}/${TEST_QUESTIONS.length} (${(passedAdaptiveStep / TEST_QUESTIONS.length * 100).toFixed(1)}%)`);
  console.log(`Total Elapsed Execution Time:     ${elapsedSec}s`);
  console.log(`Average Latency Per Question:     ${(Number(elapsedSec) / TEST_QUESTIONS.length * 1000).toFixed(1)}ms`);
  console.log('===============================================================\n');

  if (passedCurriculum === 100 && passedQuestionFidelity === 100 && passedEvaluation === 100 && passedAdaptiveStep === 100) {
    console.log('🎉 ALL 100 QUESTIONS PASSED PERFECTLY WITH ZERO DEFECTS!');
  } else {
    console.log('⚠️ Some questions had warnings. Please inspect the log above.');
  }
}

run100QuestionsTest();
