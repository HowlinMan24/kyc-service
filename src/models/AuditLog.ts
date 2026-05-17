import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from '../config/db.js';

export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<string>;
  declare actorId: string | null;
  declare action: string;
  declare resource: string;
  declare resourceId: string | null;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    actorId: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false },
    resource: { type: DataTypes.STRING, allowNull: false },
    resourceId: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'audit_logs', updatedAt: false, indexes: [{ fields: ['resource', 'resourceId'] }] },
);
