import { GenericId } from "convex/values";
import { DataModelFromSchemaDefinition } from "convex/server";
import schema from "../schema";

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
export type TableNames = keyof DataModel & string;
export type Doc<TableName extends TableNames> = DataModel[TableName]["document"];
export type Id<TableName extends TableNames> = GenericId<TableName>;
