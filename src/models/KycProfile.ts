import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type ForeignKey } from 'sequelize';
import { sequelize } from '../config/db.js';
import { User } from './User.js';

export type KycStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export class KycProfile extends Model<InferAttributes<KycProfile>, InferCreationAttributes<KycProfile>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare fullName: string;
  declare dateOfBirth: string; // ISO date
  declare nationality: string; // ISO 3166-1 alpha-2
  declare documentType: 'passport' | 'id_card' | 'driver_license';
  declare documentNumber: string;
  declare status: CreationOptional<KycStatus>;
  declare riskScore: CreationOptional<number>;
  declare rejectionReason: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

KycProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: false },
    nationality: { type: DataTypes.STRING(2), allowNull: false },
    documentType: { type: DataTypes.ENUM('passport', 'id_card', 'driver_license'), allowNull: false },
    documentNumber: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'in_review', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    riskScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    rejectionReason: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'kyc_profiles', indexes: [{ fields: ['userId'] }, { fields: ['status'] }] },
);

User.hasOne(KycProfile, { foreignKey: 'userId', as: 'kycProfile', onDelete: 'CASCADE' });
KycProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
