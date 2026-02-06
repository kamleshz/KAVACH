import RoleModel from '../models/role.model.js';
import UserModel from '../models/user.model.js';

export const seedRoles = async () => {
    try {
        const roles = ['ADMIN', 'USER', 'MANAGER'];
        const roleDocs = {};

        // 1. Ensure Roles Exist
        for (const roleName of roles) {
            let role = await RoleModel.findOne({ name: roleName });
            if (!role) {
                role = await RoleModel.create({ name: roleName, description: `Default ${roleName} role` });
                console.log(`Created role: ${roleName}`);
            }
            roleDocs[roleName] = role;
        }

        // 2. Migrate Existing Users (if any still have string roles or no role)
        // Note: Mongoose might return the string value if the schema type was changed but the data wasn't updated.
        // However, since we changed the schema type to ObjectId, queries might fail to cast the string 'ADMIN' to ObjectId.
        // We need to be careful. The best way is to fetch raw documents or handle the casting error, 
        // but finding by empty role might be safer if the schema change causes read issues.
        
        // Actually, since we just changed the code, the database still holds strings.
        // We can't easily query using the Mongoose model if the schema expects ObjectId but DB has String.
        // But let's try to fetch all and see if we can update them.
        // A safer way is to use `mongoose.connection.db.collection('users')` to bypass Mongoose schema validation for migration.
        
        const usersCollection = UserModel.collection;
        const allUsers = await usersCollection.find({}).toArray();

        for (const user of allUsers) {
            // Check if role is a string (old format)
            if (typeof user.role === 'string') {
                const roleName = user.role.toUpperCase();
                if (roleDocs[roleName]) {
                    await usersCollection.updateOne(
                        { _id: user._id },
                        { $set: { role: roleDocs[roleName]._id } }
                    );
                    console.log(`Migrated user ${user.email} to role ${roleName} (ID: ${roleDocs[roleName]._id})`);
                } else {
                    // Default to USER if role not recognized
                     await usersCollection.updateOne(
                        { _id: user._id },
                        { $set: { role: roleDocs['USER']._id } }
                    );
                    console.log(`Migrated user ${user.email} to default USER role`);
                }
            } else if (!user.role) {
                 // No role, assign USER
                 await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: { role: roleDocs['USER']._id } }
                );
                console.log(`Assigned default USER role to ${user.email}`);
            }
        }
        
        console.log("Role seeding and migration completed.");

    } catch (error) {
        console.error("Error seeding roles:", error);
    }
};
