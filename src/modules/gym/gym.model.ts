import mongoose, { Schema, Document, Model } from 'mongoose';

interface IGymAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface IGymSettings {
  currency: string;
  timezone: string;
  openingTime: string;
  closingTime: string;
  maxCapacity: number;
}

export interface IGym extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  logo: string;
  coverImage: string;
  ownerId: mongoose.Types.ObjectId;
  address: IGymAddress;
  phone: string;
  email: string;
  website: string;
  settings: IGymSettings;
  isActive: boolean;
  // Audit fields
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IGymModel extends Model<IGym> {}

const gymSchema = new Schema<IGym>(
  {
    name: {
      type: String,
      required: [true, 'Gym name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, default: '' },
    logo: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    phone: { type: String, required: [true, 'Phone is required'] },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    website: { type: String, default: '' },
    settings: {
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      openingTime: { type: String, default: '06:00' },
      closingTime: { type: String, default: '22:00' },
      maxCapacity: { type: Number, default: 100 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
gymSchema.index({ ownerId: 1 });
gymSchema.index({ isActive: 1 });

// Auto-generate slug from name before saving
gymSchema.pre('save', function () {
  if (this.isModified('name') && !this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now();
  }
});

export const Gym = mongoose.model<IGym, IGymModel>('Gym', gymSchema);
