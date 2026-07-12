import mongoose, { Schema } from 'mongoose';

interface CounterDocument {
  _id: string;
  sequence: number;
  updatedAt: Date;
}

const counterSchema = new Schema<CounterDocument>(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const CounterModel = mongoose.model<CounterDocument>('Counter', counterSchema);
