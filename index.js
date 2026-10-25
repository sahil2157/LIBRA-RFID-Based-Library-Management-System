import dotenv from "dotenv";
import dns from "node:dns";
import { existsSync } from "node:fs";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Student, Book, Transaction } from "./models.js";

// DNS configuration
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Load .env from server folder if present, otherwise project root.
const serverEnvPath = path.resolve(__dirname, ".env");
const rootEnvPath = path.resolve(rootDir, ".env");

dotenv.config({
  path: existsSync(serverEnvPath) ? serverEnvPath : rootEnvPath
});

// Check required environment variables
if (
  !process.env.MONGODB_URI ||
  !process.env.JWT_SECRET ||
  !process.env.ADMIN_PASSWORD ||
  !process.env.DEVICE_API_KEY
) {
  console.error(
    "Missing required environment variables. Copy .env.example to .env and fill it in."
  );
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Generate JWT token for admin
const tokenFor = (username) =>
  jwt.sign(
    { username, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

// Verify admin JWT
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : req.query.token;

  if (!token) {
    return res.status(401).json({
      error: "Admin sign-in required."
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "admin") {
      throw new Error("Invalid role");
    }

    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({
      error: "Session expired. Please sign in again."
    });
  }
}

// Verify ESP8266 device API key
function requireDevice(req, res, next) {
  const key = req.get("x-device-key") || req.query.deviceKey;

  if (!key || key !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({
      ok: false,
      message: "Invalid device key."
    });
  }

  next();
}

// Normalize RFID UID
const normalizeUid = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-fA-F0-9]/g, "")
    .toUpperCase();

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

// Admin login
app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  const configuredUsername = process.env.ADMIN_USERNAME || "Sahil";

  if (username !== configuredUsername || password.length === 0) {
    return res.status(401).json({
      error: "Invalid username or password."
    });
  }

  let valid = false;

  if (process.env.ADMIN_PASSWORD_HASH) {
    valid = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );
  } else {
    valid = password === process.env.ADMIN_PASSWORD;
  }

  if (!valid) {
    return res.status(401).json({
      error: "Invalid username or password."
    });
  }

  res.json({
    token: tokenFor(username),
    username
  });
});

// Check current admin session
app.get("/api/auth/me", requireAdmin, (req, res) => {
  res.json({
    username: req.admin.username
  });
});

// Dashboard statistics
app.get("/api/dashboard", requireAdmin, async (_req, res, next) => {
  try {
    const [
      students,
      activeStudents,
      books,
      activeBooks,
      issuedBooks,
      recent,
      totalTransactions
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ active: true }),
      Book.countDocuments(),
      Book.countDocuments({ active: true }),
      Book.countDocuments({
        active: true,
        currentHolder: { $ne: null }
      }),
      Transaction.find().sort({ timestamp: -1 }).limit(8).lean(),
      Transaction.countDocuments()
    ]);

    const populated = await Transaction.populate(recent, [
      { path: "student", select: "name uid" },
      { path: "book", select: "title bookId uid" }
    ]);

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const daily = await Transaction.aggregate([
      {
        $match: {
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailyMap = new Map(
      daily.map((item) => [item._id, item.count])
    );

    const activity = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const key = date.toISOString().slice(0, 10);

      activity.push({
        date: key,
        label: date.toLocaleDateString("en-IN", {
          weekday: "short"
        }),
        transactions: dailyMap.get(key) || 0
      });
    }

    res.json({
      stats: {
        students,
        activeStudents,
        books,
        activeBooks,
        issuedBooks,
        availableBooks: Math.max(0, activeBooks - issuedBooks),
        totalTransactions
      },
      recent: populated,
      activity
    });
  } catch (error) {
    next(error);
  }
});

// Get transactions with optional search and action filters
app.get("/api/transactions", requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const action = String(req.query.action || "ALL").toUpperCase();

    const query = {};

    if (["ISSUE", "RETURN"].includes(action)) {
      query.action = action;
    }

    if (search) {
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      query.$or = [
        { studentName: regex },
        { studentUID: regex },
        { bookName: regex },
        { bookId: regex },
        { bookUID: regex },
        { action: regex }
      ];
    }

    const rows = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Get all students
app.get("/api/students", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await Student.find().sort({ name: 1 }).lean());
  } catch (error) {
    next(error);
  }
});

// Add or update a student
app.post("/api/students", requireAdmin, async (req, res, next) => {
  try {
    const {
      id,
      name,
      uid,
      moodleId = "",
      email = "",
      department = "",
      division = "",
      course = "",
      active = true
    } = req.body || {};

    const normalized = normalizeUid(uid);

    const cleanEmail = String(email).trim().toLowerCase();
    if (!name?.trim() || !normalized || !String(moodleId).trim() ||
        !cleanEmail || !/^[^\s@]+@apsit\.edu\.in$/i.test(cleanEmail) ||
        !String(department).trim() || !String(division).trim()) {
      return res.status(400).json({
        error: "Name, RFID UID, Moodle ID, APSIT email, department and division are required. Use an @apsit.edu.in email address."
      });
    }

    const moodleValue = String(moodleId).trim();
    const duplicateMoodleQuery = { moodleId: moodleValue };
    if (id) duplicateMoodleQuery._id = { $ne: id };
    if (await Student.findOne(duplicateMoodleQuery).select("_id").lean()) {
      return res.status(409).json({ error: "That Moodle ID is already registered." });
    }

    const data = {
      name: name.trim(),
      uid: normalized,
      moodleId: moodleValue,
      email: cleanEmail,
      department: String(department).trim(),
      division: String(division).trim(),
      course: String(department).trim(),
      active: Boolean(active)
    };

    const student = id
      ? await Student.findByIdAndUpdate(id, data, {
          new: true,
          runValidators: true
        })
      : await Student.create(data);

    if (!student) {
      return res.status(404).json({
        error: "Student not found."
      });
    }

    res.json(student);
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = Object.keys(error.keyPattern || {});
      return res.status(409).json({
        error: duplicate.includes("moodleId") ? "That Moodle ID is already registered." : "That student RFID UID is already registered."
      });
    }

    next(error);
  }
});

// Per-student analytics: issue/return counts, timeline and current borrowed books.
app.get("/api/students/:id/analytics", requireAdmin, async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).lean();
    if (!student) return res.status(404).json({ error: "Student not found." });

    const [counts, recent, currentBooks] = await Promise.all([
      Transaction.aggregate([
        { $match: { student: new mongoose.Types.ObjectId(req.params.id) } },
        { $group: { _id: "$action", count: { $sum: 1 } } }
      ]),
      Transaction.find({ student: new mongoose.Types.ObjectId(req.params.id) })
        .sort({ timestamp: -1 }).limit(100).lean(),
      Book.find({ currentHolder: new mongoose.Types.ObjectId(req.params.id), active: true })
        .select("bookId title uid currentHolder").lean()
    ]);
    const actionCounts = { ISSUE: counts.find(x => x._id === "ISSUE")?.count || 0, RETURN: counts.find(x => x._id === "RETURN")?.count || 0 };
    const dailyMap = new Map();
    for (const row of recent) {
      const day = new Date(row.timestamp).toLocaleDateString("en-CA");
      if (!dailyMap.has(day)) dailyMap.set(day, { date: day, issue: 0, returned: 0 });
      dailyMap.get(day)[row.action === "ISSUE" ? "issue" : "returned"]++;
    }
    res.json({ student, counts: { ...actionCounts, total: actionCounts.ISSUE + actionCounts.RETURN, currentlyBorrowed: currentBooks.length }, currentBooks, recent, activity: [...dailyMap.values()].reverse() });
  } catch (error) { next(error); }
});

// Deactivate a student
app.delete("/api/students/:id", requireAdmin, async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        error: "Student not found."
      });
    }

    res.json({ ok: true, student });
  } catch (error) {
    next(error);
  }
});

// Get all books
app.get("/api/books", requireAdmin, async (_req, res, next) => {
  try {
    const books = await Book.find()
      .populate("currentHolder", "name uid")
      .sort({ title: 1 })
      .lean();

    res.json(books);
  } catch (error) {
    next(error);
  }
});

// Add or update a book
app.post("/api/books", requireAdmin, async (req, res, next) => {
  try {
    const {
      id,
      bookId,
      title,
      uid,
      author = "",
      category = "",
      active = true
    } = req.body || {};

    const normalized = normalizeUid(uid);

    if (!bookId?.trim() || !title?.trim() || !normalized) {
      return res.status(400).json({
        error: "Book ID, title and RFID UID are required."
      });
    }

    const data = {
      bookId: bookId.trim().toUpperCase(),
      title: title.trim(),
      uid: normalized,
      author: String(author).trim(),
      category: String(category).trim(),
      active: Boolean(active)
    };

    const book = id
      ? await Book.findByIdAndUpdate(id, data, {
          new: true,
          runValidators: true
        })
      : await Book.create(data);

    if (!book) {
      return res.status(404).json({
        error: "Book not found."
      });
    }

    res.json(book);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "That Book ID or RFID UID is already registered."
      });
    }

    next(error);
  }
});

// Deactivate a book
app.delete("/api/books/:id", requireAdmin, async (req, res, next) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({
        error: "Book not found."
      });
    }

    res.json({ ok: true, book });
  } catch (error) {
    next(error);
  }
});

// Reports
app.get("/api/reports", requireAdmin, async (_req, res, next) => {
  try {
    const [byAction, topStudents, topBooks] = await Promise.all([
      Transaction.aggregate([
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 }
          }
        }
      ]),
      Transaction.aggregate([
        {
          $group: {
            _id: "$studentUID",
            studentName: { $first: "$studentName" },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { transactions: -1 } },
        { $limit: 10 }
      ]),
      Transaction.aggregate([
        {
          $group: {
            _id: "$bookId",
            bookName: { $first: "$bookName" },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { transactions: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      actions: {
        ISSUE: byAction.find((item) => item._id === "ISSUE")?.count || 0,
        RETURN: byAction.find((item) => item._id === "RETURN")?.count || 0
      },
      topStudents,
      topBooks
    });
  } catch (error) {
    next(error);
  }
});

// Process RFID scan from ESP8266
async function handleDeviceScan(req, res) {
  try {
    const source = req.method === "GET" ? req.query : req.body;

    const studentUID = normalizeUid(source.studentUID);
    const bookUID = normalizeUid(source.bookUID);

    if (!studentUID || !bookUID) {
      return res.status(400).json({
        ok: false,
        message: "studentUID and bookUID are required."
      });
    }

    const student = await Student.findOne({
      uid: studentUID,
      active: true
    });

    if (!student) {
      return res.status(404).json({
        ok: false,
        message: "Unknown or inactive student card.",
        result: "ERROR"
      });
    }

    const book = await Book.findOne({
      uid: bookUID,
      active: true
    });

    if (!book) {
      return res.status(404).json({
        ok: false,
        message: "Unknown or inactive book tag.",
        result: "ERROR"
      });
    }

    let action;

    if (!book.currentHolder) {
      book.currentHolder = student._id;
      action = "ISSUE";
    } else if (String(book.currentHolder) === String(student._id)) {
      book.currentHolder = null;
      action = "RETURN";
    } else {
      const holder = await Student.findById(book.currentHolder);

      return res.status(409).json({
        ok: false,
        result: "ERROR",
        message: `This book is currently issued to ${
          holder?.name || "another student"
        }.`
      });
    }

    await book.save();

    const transaction = await Transaction.create({
      student: student._id,
      book: book._id,
      studentName: student.name,
      studentUID: student.uid,
      bookId: book.bookId,
      bookName: book.title,
      bookUID: book.uid,
      action,
      source: "RFID",
      timestamp: new Date()
    });

    return res.json({
      ok: true,
      result: action,
      action,
      message:
        action === "ISSUE"
          ? "Book issued successfully."
          : "Book returned successfully.",
      transaction: {
        id: transaction._id,
        studentName: student.name,
        studentUID: student.uid,
        bookId: book.bookId,
        bookName: book.title,
        bookUID: book.uid,
        action,
        timestamp: transaction.timestamp
      }
    });
  } catch (error) {
    console.error("Device scan error:", error);

    return res.status(500).json({
      ok: false,
      result: "ERROR",
      message: "Server could not process the scan."
    });
  }
}

app.post("/api/device/scan", requireDevice, handleDeviceScan);
app.get("/api/device/scan", requireDevice, handleDeviceScan);

// Export transactions as CSV
app.get(
  "/api/export/transactions",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const rows = await Transaction.find()
        .sort({ timestamp: -1 })
        .lean();

      const columns = [
        "timestamp",
        "studentName",
        "studentUID",
        "bookId",
        "bookName",
        "bookUID",
        "action",
        "source"
      ];

      const esc = (value) =>
        `"${String(value ?? "").replaceAll('"', '""')}"`;

      const csv = [
        columns.join(","),
        ...rows.map((row) =>
          columns
            .map((column) =>
              esc(
                column === "timestamp"
                  ? row[column]?.toISOString?.()
                  : row[column]
              )
            )
            .join(",")
        )
      ].join("\r\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="rfid-library-transactions.csv"'
      );

      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

// Serve built dashboard files
app.use(express.static(path.join(rootDir, "dist")));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(
    path.join(rootDir, "dist", "index.html"),
    (error) => {
      if (error) next(error);
    }
  );
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid record ID." });
  }

  res.status(500).json({
    error: "Unexpected server error."
  });
});

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);

console.log("Connected to MongoDB.");

// Seed default students and book if they do not already exist
async function seedDefaults() {
  const students = [
    {
      name: "Sahil",
      uid: "ED5F4D07",
      course: "Information Technology",
      active: true
    },
    {
      name: "Suyash",
      uid: "E9D53F02",
      course: "Information Technology",
      active: true
    },
    {
      name: "Mann",
      uid: "C93D1706",
      course: "Information Technology",
      active: true
    }
  ];

  for (const item of students) {
    await Student.updateOne(
      { uid: item.uid },
      { $setOnInsert: item },
      { upsert: true }
    );
  }

  const book = {
    bookId: "B001",
    title: "Data Science",
    uid: "030A63F7",
    author: "",
    category: "Technology",
    active: true
  };

  await Book.updateOne(
    { uid: book.uid },
    { $setOnInsert: book },
    { upsert: true }
  );
}

await seedDefaults();

// Start server
app.listen(port, host, () => {
  console.log(`API/server running at http://localhost:${port}`);
  console.log(`LAN address: http://<YOUR-PC-IP>:${port}`);
});