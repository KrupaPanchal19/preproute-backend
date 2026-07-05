import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'preproute_secret_key_123_abc';

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Database file paths
const TESTS_FILE = path.join(__dirname, 'tests.json');
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

// Initialize database files if they don't exist
if (!fs.existsSync(TESTS_FILE)) {
  fs.writeFileSync(TESTS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(QUESTIONS_FILE)) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify([], null, 2));
}

// Interfaces
interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

interface SubTopic {
  id: string;
  name: string;
  topic_id: string;
}

interface Test {
  id: string;
  name: string;
  type: string;
  subject: string;
  topics: string[];
  sub_topics: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: string;
  total_time: number;
  total_marks: number;
  total_questions: number;
  questions: string[];
  status: 'draft' | 'live' | null;
  created_at: string;
}

interface Question {
  id: string;
  type: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: string;
  test_id: string;
  topic_id?: string;
  sub_topic_id?: string;
  media_url?: string;
}

// Extend Express Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Seed Data
const subjects: Subject[] = [
  { id: 'math-uuid', name: 'Mathematics' },
  { id: 'physics-uuid', name: 'Physics' },
  { id: 'chemistry-uuid', name: 'Chemistry' },
  { id: 'biology-uuid', name: 'Biology' }
];

const topics: Topic[] = [
  // Math topics
  { id: 'math-alg-uuid', name: 'Algebra', subject_id: 'math-uuid' },
  { id: 'math-geo-uuid', name: 'Geometry', subject_id: 'math-uuid' },
  { id: 'math-calc-uuid', name: 'Calculus', subject_id: 'math-uuid' },
  // Physics topics
  { id: 'phys-mech-uuid', name: 'Mechanics', subject_id: 'physics-uuid' },
  { id: 'phys-thermo-uuid', name: 'Thermodynamics', subject_id: 'physics-uuid' },
  // Chemistry topics
  { id: 'chem-org-uuid', name: 'Organic Chemistry', subject_id: 'chemistry-uuid' },
  { id: 'chem-inorg-uuid', name: 'Inorganic Chemistry', subject_id: 'chemistry-uuid' }
];

const subTopics: SubTopic[] = [
  // Algebra subtopics
  { id: 'math-alg-lin-uuid', name: 'Linear Equations', topic_id: 'math-alg-uuid' },
  { id: 'math-alg-quad-uuid', name: 'Quadratic Equations', topic_id: 'math-alg-uuid' },
  { id: 'math-alg-mat-uuid', name: 'Matrices', topic_id: 'math-alg-uuid' },
  // Geometry subtopics
  { id: 'math-geo-tri-uuid', name: 'Triangles', topic_id: 'math-geo-uuid' },
  { id: 'math-geo-cir-uuid', name: 'Circles', topic_id: 'math-geo-uuid' },
  // Mechanics subtopics
  { id: 'phys-mech-kin-uuid', name: 'Kinematics', topic_id: 'phys-mech-uuid' },
  { id: 'phys-mech-newt-uuid', name: 'Newton\'s Laws', topic_id: 'phys-mech-uuid' }
];

// Helper database functions
const readTests = (): Test[] => JSON.parse(fs.readFileSync(TESTS_FILE, 'utf8'));
const writeTests = (data: Test[]): void => fs.writeFileSync(TESTS_FILE, JSON.stringify(data, null, 2));

const readQuestions = (): Question[] => JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
const writeQuestions = (data: Question[]): void => fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2));

// Auth Middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Token Required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or Expired Token' });
    }
    req.user = user;
    next();
  });
};

// 1. Login Endpoint
app.post('/auth/login', (req: Request, res: Response) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ success: false, message: 'UserId and Password are required' });
  }

  // Simple mock credentials
  if (userId === 'admin' && password === 'password123') {
    const user = { userId: 'admin', role: 'creator' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      success: true,
      data: {
        token,
        user
      }
    });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// 2. Get All Subjects
app.get('/subjects', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: subjects
  });
});

// 3. Get Topics by Subject
app.get('/topics/subject/:subjectId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const subjectId = req.params.subjectId;
  const filteredTopics = topics.filter(t => t.subject_id === subjectId);
  res.json({
    success: true,
    data: filteredTopics
  });
});

// 4. Get Sub-topics by Topic
app.get('/sub-topics/topic/:topicId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const topicId = req.params.topicId;
  const filteredSubTopics = subTopics.filter(st => st.topic_id === topicId);
  res.json({
    success: true,
    data: filteredSubTopics
  });
});

// 11. Sub Topic by Topic List (Multi-topics POST)
app.post('/sub-topics/multi-topics', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { topicIds } = req.body;
  if (!topicIds || !Array.isArray(topicIds)) {
    return res.status(400).json({ success: false, message: 'topicIds list is required' });
  }
  const filteredSubTopics = subTopics.filter(st => topicIds.includes(st.topic_id));
  res.json({
    success: true,
    data: filteredSubTopics
  });
});

// Helper: Resolve IDs in test for response mapping
const resolveTestDetails = (test: Test) => {
  const subObj = subjects.find(s => s.id === test.subject);
  const subjectName = subObj ? subObj.name : test.subject;
  const topicNames = (test.topics || []).map(topicId => {
    const topObj = topics.find(t => t.id === topicId);
    return topObj ? topObj.name : topicId;
  });

  return {
    ...test,
    subject: subjectName,
    subject_id: test.subject, // preserve original ID
    topics: topicNames,
    topic_ids: test.topics, // preserve original IDs
    sub_topic_ids: test.sub_topics || []
  };
};

// 5. Get All Tests
app.get('/tests', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tests = readTests();
  const resolvedTests = tests.map(resolveTestDetails);
  res.json({
    success: true,
    data: resolvedTests
  });
});

// 8. Get Test by ID
app.get('/tests/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tests = readTests();
  const test = tests.find(t => t.id === req.params.id);
  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }
  res.json({
    success: true,
    data: resolveTestDetails(test)
  });
});

// 6. Create Test
app.post('/tests', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const {
    name, type, subject, topics, sub_topics,
    correct_marks, wrong_marks, unattempt_marks,
    difficulty, total_time, total_marks, total_questions
  } = req.body;

  if (!name || !subject) {
    return res.status(400).json({ success: false, message: 'Name and Subject are required fields' });
  }

  const newTest: Test = {
    id: uuidv4(),
    name,
    type: type || 'chapterwise',
    subject,
    topics: topics || [],
    sub_topics: sub_topics || [],
    correct_marks: typeof correct_marks === 'number' ? correct_marks : 4,
    wrong_marks: typeof wrong_marks === 'number' ? wrong_marks : -1,
    unattempt_marks: typeof unattempt_marks === 'number' ? unattempt_marks : 0,
    difficulty: difficulty || 'medium',
    total_time: typeof total_time === 'number' ? total_time : 60,
    total_marks: typeof total_marks === 'number' ? total_marks : 100,
    total_questions: typeof total_questions === 'number' ? total_questions : 0,
    questions: [],
    status: 'draft',
    created_at: new Date().toISOString()
  };

  const tests = readTests();
  tests.push(newTest);
  writeTests(tests);

  res.json({
    success: true,
    data: newTest,
    message: 'Test created successfully'
  });
});

// 7 & 10. Update Test & Publish Test
app.put('/tests/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const testId = req.params.id;
  const tests = readTests();
  const testIndex = tests.findIndex(t => t.id === testId);

  if (testIndex === -1) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }

  const existingTest = tests[testIndex];
  const updateData = req.body;

  // Perform updates
  const updatedTest: Test = {
    ...existingTest,
    ...updateData
  };

  // Ensure fields are properly cast if updated
  if (updateData.correct_marks !== undefined) updatedTest.correct_marks = Number(updateData.correct_marks);
  if (updateData.wrong_marks !== undefined) updatedTest.wrong_marks = Number(updateData.wrong_marks);
  if (updateData.unattempt_marks !== undefined) updatedTest.unattempt_marks = Number(updateData.unattempt_marks);
  if (updateData.total_time !== undefined) updatedTest.total_time = Number(updateData.total_time);
  if (updateData.total_marks !== undefined) updatedTest.total_marks = Number(updateData.total_marks);
  if (updateData.total_questions !== undefined) updatedTest.total_questions = Number(updateData.total_questions);

  tests[testIndex] = updatedTest;
  writeTests(tests);

  res.json({
    success: true,
    data: updatedTest,
    message: updateData.status === 'live' ? 'Test published successfully' : 'Test updated successfully'
  });
});

// Delete Test Endpoint (Dashboard Action)
app.delete('/tests/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const testId = req.params.id;
  let tests = readTests();
  const testIndex = tests.findIndex(t => t.id === testId);

  if (testIndex === -1) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }

  tests.splice(testIndex, 1);
  writeTests(tests);

  res.json({
    success: true,
    message: 'Test deleted successfully'
  });
});

// 9. Bulk Create Questions
app.post('/questions/bulk', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { questions } = req.body;
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, message: 'questions array is required' });
  }

  const createdQuestions: Question[] = questions.map(q => ({
    id: uuidv4(),
    type: q.type || 'mcq',
    question: q.question,
    option1: q.option1,
    option2: q.option2,
    option3: q.option3,
    option4: q.option4,
    correct_option: q.correct_option,
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'medium',
    test_id: q.test_id,
    topic_id: q.topic_id || '',
    sub_topic_id: q.sub_topic_id || '',
    media_url: q.media_url || ''
  }));

  const dbQuestions = readQuestions();
  dbQuestions.push(...createdQuestions);
  writeQuestions(dbQuestions);

  res.json({
    success: true,
    data: createdQuestions,
    message: `Successfully created ${createdQuestions.length} questions`
  });
});

// 12. Fetch Bulk Questions
app.post('/questions/fetchBulk', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { question_ids } = req.body;
  if (!question_ids || !Array.isArray(question_ids)) {
    return res.status(400).json({ success: false, message: 'question_ids array is required' });
  }

  const allQuestions = readQuestions();
  const matchedQuestions = allQuestions.filter(q => question_ids.includes(q.id));

  res.json({
    success: true,
    data: matchedQuestions
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
