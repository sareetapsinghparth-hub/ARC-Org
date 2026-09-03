import { LessonData } from '../types';

/**
 * Detect whether input is a specific question or problem statement.
 */
export function isQuestionPrompt(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.includes('?')) return true;
  const lower = t.toLowerCase();
  const questionWords = [
    'what', 'why', 'how', 'when', 'where', 'who', 'which',
    'explain', 'solve', 'calculate', 'find', 'derive', 'prove',
    'determine', 'evaluate', 'compute', 'differentiate', 'integrate',
    'simplify', 'is', 'can', 'does', 'do', 'will', 'show that'
  ];
  return questionWords.some((qw) => lower.startsWith(qw + ' ') || lower.startsWith(qw + "'"));
}

/**
 * Builds a structured, domain-coherent curriculum with the user's exact question as Question #1.
 */
export function buildClientCurriculum(
  input: string,
  isWebSearch = false,
  customText?: string
): LessonData {
  const cleanInput = (input || '').trim();
  const isQuestion = isQuestionPrompt(cleanInput);
  const lower = cleanInput.toLowerCase();
  const title = isQuestion ? cleanInput.replace(/[?.,!]+$/, '') : cleanInput;

  let domain = 'General Science & Mathematics';
  let c1Name = 'Prerequisite Principles & Axioms';
  let c1Desc = `Foundational rules, definitions, and mathematical setup required for ${title}.`;
  let c2Name = 'Core Theoretical Formulation';
  let c2Desc = `Primary equations, models, and analytical structures governing ${title}.`;
  let c3Name = 'Operational Mechanics & Derivations';
  let c3Desc = `Procedural steps, transformation rules, and step-by-step reasoning in ${title}.`;
  let c4Name = 'Synthesis & Boundary Cases';
  let c4Desc = `Diagnostic evaluation, edge cases, and real-world system applications of ${title}.`;

  if (lower.includes('calculus') || lower.includes('deriv') || lower.includes('integr') || lower.includes('limit') || lower.includes('chain rule')) {
    domain = 'Calculus & Analysis';
    c1Name = 'Limits & Continuity Foundations';
    c1Desc = 'Epsilon-delta definitions, incremental quotients, and asymptotic behaviors.';
    c2Name = 'Differentiation Operators & Rules';
    c2Desc = 'Product rule, quotient rule, chain rule, and rate-of-change interpretations.';
    c3Name = 'Integration & Accumulation';
    c3Desc = 'Riemann sums, Fundamental Theorem of Calculus, and anti-derivatives.';
    c4Name = 'Differential Equations & Applications';
    c4Desc = 'Optimization, related rates, taylor approximations, and dynamical models.';
  } else if (lower.includes('matrix') || lower.includes('vector') || lower.includes('linear algebra') || lower.includes('eigen') || lower.includes('determinant')) {
    domain = 'Linear Algebra';
    c1Name = 'Vector Spaces & Span';
    c1Desc = 'Linear combinations, basis vectors, and subspace dimensions.';
    c2Name = 'Matrix Transformations & Rank';
    c2Desc = 'Linear maps T(x) = Ax, kernel/nullspace, and invertibility conditions.';
    c3Name = 'Eigenvalues & Characteristic Polynomials';
    c3Desc = 'Invariant directions Av = lambda*v and spectral properties.';
    c4Name = 'Diagonalization & SVD';
    c4Desc = 'Coordinate transforms, principal component axes, and matrix decompositions.';
  } else if (lower.includes('quantum') || lower.includes('qubit') || lower.includes('wave') || lower.includes('schrodinger') || lower.includes('photon')) {
    domain = 'Quantum Physics';
    c1Name = 'Wave-Particle Duality & Operators';
    c1Desc = 'State vectors in Hilbert space, observables as Hermitian operators, and Born rule.';
    c2Name = 'Superposition & Measurement';
    c2Desc = 'Linear state combinations, wavefunction collapse, and Heisenberg uncertainty.';
    c3Name = 'Entanglement & Quantum Circuits';
    c3Desc = 'Bell states, tensor products, quantum logic gates, and non-locality.';
    c4Name = 'Decoherence & Quantum Algorithms';
    c4Desc = 'Density matrices, environmental coupling, phase estimation, and speedup.';
  } else if (lower.includes('neural') || lower.includes('transformer') || lower.includes('attention') || lower.includes('backprop') || lower.includes('ai') || lower.includes('machine learning')) {
    domain = 'Deep Learning & AI';
    c1Name = 'Optimization & Loss Landscapes';
    c1Desc = 'Gradient descent, learning rates, loss functions, and convexity dynamics.';
    c2Name = 'Backpropagation & Computational Graphs';
    c2Desc = 'Multivariate chain rule, tensor gradients, and parameter update passes.';
    c3Name = 'Self-Attention & Multi-Head Projections';
    c3Desc = 'Query-Key-Value dot-product scaling, softmax routing, and position encodings.';
    c4Name = 'Architectural Scaling & Generalization';
    c4Desc = 'Residual connections, normalization layers, regularization, and emergence.';
  } else if (lower.includes('dna') || lower.includes('crispr') || lower.includes('gene') || lower.includes('cell') || lower.includes('protein') || lower.includes('biology') || lower.includes('photosynthesis')) {
    domain = 'Molecular & Cellular Biology';
    c1Name = 'Molecular Structure & Enzymes';
    c1Desc = 'Nucleic acids, amino acid polypeptide folding, and catalytic active sites.';
    c2Name = 'Central Dogma & Transcription';
    c2Desc = 'DNA replication machinery, RNA polymerase transcription, and ribosomal translation.';
    c3Name = 'Biochemical Pathways & Energy Transfer';
    c3Desc = 'Phosphorylation, proton gradients, ATP synthesis, and enzymatic cascades.';
    c4Name = 'Genetic Regulation & Editing Systems';
    c4Desc = 'Promoters, repressors, guide RNA Cas9 cleavage, and genomic repair.';
  } else if (lower.includes('chemistry') || lower.includes('acid') || lower.includes('reaction') || lower.includes('mole') || lower.includes('thermodynamic')) {
    domain = 'Chemistry & Thermodynamics';
    c1Name = 'Atomic Structure & Bonding';
    c1Desc = 'Electron configurations, electronegativity, and valence bond interactions.';
    c2Name = 'Stoichiometry & Reaction Kinetics';
    c2Desc = 'Molar ratios, rate laws, activation energy, and collision frequency.';
    c3Name = 'Chemical Equilibrium & Le Chatelier';
    c3Desc = 'Equilibrium constant Keq, reaction quotient Q, and dynamic adjustments.';
    c4Name = 'Enthalpy, Entropy & Gibbs Free Energy';
    c4Desc = 'First and second laws, spontaneous delta G = delta H - T delta S conditions.';
  } else if (lower.includes('physics') || lower.includes('newton') || lower.includes('gravity') || lower.includes('force') || lower.includes('momentum') || lower.includes('velocity')) {
    domain = 'Classical & Analytical Mechanics';
    c1Name = 'Kinematics & Coordinate Frames';
    c1Desc = 'Position, velocity, acceleration vectors, and reference frame transformations.';
    c2Name = "Newtonian Dynamics & Free Body Analysis";
    c2Desc = 'Newton’s three laws, net force summation Sigma F = ma, and constraint forces.';
    c3Name = 'Conservation of Energy & Momentum';
    c3Desc = 'Work-energy theorem, conservative potentials, and elastic/inelastic collisions.';
    c4Name = 'Rotational Dynamics & Oscillations';
    c4Desc = 'Torque, moment of inertia, angular momentum conservation, and harmonic motion.';
  } else if (lower.includes('algorithm') || lower.includes('tree') || lower.includes('sort') || lower.includes('graph') || lower.includes('complexity') || lower.includes('dynamic programming')) {
    domain = 'Computer Science & Data Structures';
    c1Name = 'Asymptotic Complexity & Invariants';
    c1Desc = 'Big-O upper bounds, loop invariants, and recurrence relations (Master theorem).';
    c2Name = 'Abstract Data Types & Traversal';
    c2Desc = 'Balanced trees, priority heaps, hash maps, and breadth/depth-first search.';
    c3Name = 'Divide-and-Conquer & Dynamic Programming';
    c3Desc = 'Optimal substructure, overlapping subproblems, and memoized transitions.';
    c4Name = 'Graph Algorithms & Optimization';
    c4Desc = 'Shortest paths (Dijkstra), minimum spanning trees, and network flow.';
  }

  const concepts = [
    { id: 'c1', name: c1Name, description: c1Desc, importance: 4, confidence: 0.5 },
    { id: 'c2', name: c2Name, description: c2Desc, importance: 5, confidence: 0.5 },
    { id: 'c3', name: c3Name, description: c3Desc, importance: 5, confidence: 0.5 },
    { id: 'c4', name: c4Name, description: c4Desc, importance: 4, confidence: 0.5 },
  ];

  const prerequisites = [
    { source: 'c1', target: 'c2', relation: 'Foundational principles establish theoretical formulations' },
    { source: 'c2', target: 'c3', relation: 'Theoretical models dictate operational mechanisms and calculations' },
    { source: 'c3', target: 'c4', relation: 'Procedural proficiency enables higher-level synthesis and edge cases' },
    { source: 'c1', target: 'c3', relation: 'Direct prerequisite grounding for procedural transformations' },
  ];

  const firstPrompt = isQuestion
    ? cleanInput
    : `Explain the fundamental mechanisms and core principles of ${cleanInput}. What prerequisite assumptions and operational rules govern this concept?`;

  const questions = [
    {
      id: 'q1',
      conceptId: 'c2',
      conceptName: c2Name,
      difficulty: 'intermediate' as const,
      prompt: firstPrompt,
      rubricKeyPoints: [
        'Clear statement of fundamental principles and definitions',
        'Accurate algebraic, mechanistic, or logical step-by-step reasoning',
        'Identification of key variables, constraints, or biological/physical components',
        'Sound conclusion with correct notation and dimensional or conceptual validity',
      ],
      sampleSolution: `To evaluate "${cleanInput}": First, identify the governing principles (${c2Name}). Set up the core relationship or equation. Carry through intermediate transformations with explicit steps, and verify boundary conditions (${c4Name}).`,
      isPrerequisiteCheck: false,
    },
    {
      id: 'q2',
      conceptId: 'c1',
      conceptName: c1Name,
      difficulty: 'foundational' as const,
      prompt: `Before applying ${c2Name}, what prerequisite axioms, baseline definitions, and conditions must hold in ${domain}? Identify at least two foundational requirements.`,
      rubricKeyPoints: [
        'Identifies prerequisite definitions accurately',
        'Explains why these conditions are necessary before applying core formulas',
        'Provides a concrete counterexample or boundary case if assumptions fail',
      ],
      sampleSolution: `The prerequisite foundations for ${c2Name} require established axioms of ${c1Name}. Without these baseline assumptions, the mathematical or physical model loses validity.`,
      isPrerequisiteCheck: true,
      targetPrerequisiteOf: 'c2',
    },
    {
      id: 'q3',
      conceptId: 'c3',
      conceptName: c3Name,
      difficulty: 'intermediate' as const,
      prompt: `Demonstrate the procedural derivation or operational workflow in ${c3Name} as applied to ${title}. Walk step-by-step through a concrete case.`,
      rubricKeyPoints: [
        'Step-by-step derivation or calculation',
        'Proper grouping of intermediate terms or steps',
        'Correct final evaluated expression or mechanism',
      ],
      sampleSolution: `Apply the transformation rules of ${c3Name}. Break down into step 1 (setup), step 2 (intermediate transformation), and step 3 (simplification).`,
      isPrerequisiteCheck: false,
    },
    {
      id: 'q4',
      conceptId: 'c4',
      conceptName: c4Name,
      difficulty: 'advanced' as const,
      prompt: `Consider an edge case, perturbed boundary condition, or real-world application in ${title}. How does ${c4Name} predict the system behavior?`,
      rubricKeyPoints: [
        'Analyzes asymptotic or perturbed behavior',
        'Connects underlying theory to real-world or boundary manifestation',
        'Evaluates tradeoffs or stability conditions',
      ],
      sampleSolution: `In extreme conditions, higher-order effects described by ${c4Name} dominate. Examining limits reveals system stability and operational constraints.`,
      isPrerequisiteCheck: false,
    },
  ];

  const webSources = isWebSearch
    ? [
        {
          title: `MIT OpenCourseWare: Foundations of ${domain}`,
          url: `https://ocw.mit.edu/search/?q=${encodeURIComponent(cleanInput)}`,
        },
        {
          title: `Stanford Encyclopedia & Academic Archives: ${cleanInput}`,
          url: `https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(cleanInput)}`,
        },
        {
          title: `Khan Academy Reference: ${title}`,
          url: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(cleanInput)}`,
        },
      ]
    : undefined;

  return {
    topic: title,
    overview: isQuestion
      ? `Diagnostic study unit focused on answering: "${cleanInput}". Deconstructs core prerequisite dependencies, theoretical formulation, and step-by-step resolution.`
      : `Adaptive prerequisite curriculum for ${cleanInput} (${domain}). Explores foundational principles, operational mechanisms, and diagnostic problem challenges.`,
    concepts,
    prerequisites,
    questions,
    webSources,
    sourceType: isWebSearch ? 'web-search' : customText ? 'custom-text' : 'custom-topic',
    sourceName: isWebSearch ? `Web Grounded: ${title}` : customText ? 'Custom Notes' : title,
  };
}
