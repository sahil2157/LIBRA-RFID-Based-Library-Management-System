import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  uid: { type: String, required: true, unique: true, uppercase: true, trim: true },
  moodleId: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, match: /^[^\s@]+@apsit\.edu\.in$/i },
  department: { type: String, required: true, trim: true },
  division: { type: String, required: true, trim: true },
  course: { type: String, trim: true, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const bookSchema = new mongoose.Schema({
  bookId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  uid: { type: String, required: true, unique: true, uppercase: true, trim: true },
  author: { type: String, trim: true, default: "" },
  category: { type: String, trim: true, default: "" },
  active: { type: Boolean, default: true },
  currentHolder: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null }
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  studentName: { type: String, required: true },
  studentUID: { type: String, required: true, uppercase: true },
  bookId: { type: String, required: true, uppercase: true },
  bookName: { type: String, required: true },
  bookUID: { type: String, required: true, uppercase: true },
  action: { type: String, enum: ["ISSUE", "RETURN"], required: true },
  source: { type: String, enum: ["RFID", "ADMIN"], default: "RFID" },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

transactionSchema.index({ timestamp: -1 });
transactionSchema.index({ studentUID: 1, bookUID: 1 });

export const Student = mongoose.model("Student", studentSchema);
export const Book = mongoose.model("Book", bookSchema);
export const Transaction = mongoose.model("Transaction", transactionSchema);
