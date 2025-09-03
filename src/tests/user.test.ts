import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {MongoMemoryServer}from 'mongodb-memory-server';
import app from '../app';
import User from '../models/user.model';
import Counter from '../models/counter.model';
import {beforeAll,afterAll, describe,it ,expect, beforeEach, afterEach} from '@jest/globals';
import { getNextSequence } from '../../src/utils/getNextSequence';
import { jest } from '@jest/globals';

describe('User API tests',()=>{
    let mongoServer:MongoMemoryServer;
    let adminToken:string;
    let employeeToken:string;
    let adminUser:any;
    let employeeUser:any;

    beforeAll(async()=>{
        mongoServer=await MongoMemoryServer.create();
        const mongoUri=mongoServer.getUri();
        await mongoose.connect(mongoUri);

        await User.syncIndexes();

        await Counter.create({_id:'userid',sequencecounter:2});
        await setupTestUsers();
    });

    afterAll(async()=>{
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    beforeEach(async()=>{
        const collections=mongoose.connection.collections;
        for(const key in collections){
            if(key!=='users'&& key!=='counters'){
                await collections[key]?.deleteMany({});
            }
        }
        await setupTestUsers();
    });

    async function setupTestUsers(){
        const hashedAdminPassword=await bcrypt.hash("Adminpassword@123",10);
        adminUser=await User.create({
            userid:1,
            name:"Admin user",
            email:"admin@test.com",
            password:hashedAdminPassword,
            role:'admin',
            isTemporaryPassword:false
        });

        const hashedEmployeePassword=await bcrypt.hash("Employeepassword@123",10);
        employeeUser=await User.create({
            userid:2,
            name:"Employee User",
            email:"employee@test.com",
            password:hashedEmployeePassword,
            role:'employee',
            isTemporaryPassword:false
        });

        const jwtSecret=process.env.JWT_SECRET!;
        adminToken=jwt.sign(
            {userid:adminUser.userid,email:adminUser.email,role:adminUser.role,isTemporaryPassword:false},
            jwtSecret,
            {expiresIn:'24h'}
        );

        employeeToken=jwt.sign(
            {userid:employeeUser.userid,email:employeeUser.email,role:employeeUser.role,isTemporaryPassword:false},
            jwtSecret,
            {expiresIn:'24h'}
        );
    }

    describe('POST /api/users/v1/user -Register User',()=>{
        it('should successfully register a new user as admin',async()=>{
            const newUser={
                name:'John Doe',
                email:'john@test.com',
                password:'Password@123',
                role:'employee'
            };

            const response=(await request(app).post('/api/users/v1/user')
                .set('Cookie',`token=${adminToken}`)
                .send(newUser)
                .expect(201));

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('User validated successfully');
            expect(response.body.data.name).toBe(newUser.name);
            expect(response.body.data.email).toBe(newUser.email);
            expect(response.body.data.role).toBe(newUser.role);
            expect(response.body.password).toBe(undefined);
        });

        it('should fail to register user without admin token',async()=>{
            const newUser={
                name:'John Doe',
                email:'john@test.com',
                password:'Password@123',
                role:'employee'
            };

            const response=(await request(app).post('/api/users/v1/user')
                .set('Cookie',`token=${employeeToken}`)
                .send(newUser)
                .expect(401));
        });

        it('should fail to register user without authentication',async()=>{
            const newUser={
                name:'John Doe',
                email:'john@test.com',
                password:'Password@123',
                role:'employee'
            };

            await request(app).post('/api/users/v1/user')
                .send(newUser)
                .expect(401);
        });

        it('should fail with invalid email formal',async()=>{
            const newUser={
                name:'John Doe',
                email:'john.com',
                password:'Password@123',
                role:'employee'
            };

            const response=(await request(app).post('/api/users/v1/user')
                .set('Cookie',`token=${adminToken}`)
                .send(newUser)
                .expect(400));
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('please provide a valid email for registration');
        });

        it('should fail with weak password',async()=>{
            const newUser={
                name:'John Doe',
                email:'john@test.com',
                password:'123',
                role:'employee'
            };

            const response=(await request(app).post('/api/users/v1/user')
                .set('Cookie',`token=${adminToken}`)
                .send(newUser)
                .expect(400));

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Passwords must be atleast 6 characters long');
        });

        it('should fail with invalid role',async()=>{
            const newUser={
                name:'John Doe',
                email:'john@test.com',
                password:'Password@123',
                role:'byebye'
            };

            const response=(await request(app).post('/api/users/v1/user')
                .set('Cookie',`token=${adminToken}`)
                .send(newUser)
                .expect(400));

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Role must be either employee or admin');
        });

        it('should fail with duplicate email',async()=>{
            const newUser1={
                name:'John Doe',
                email:'john@test.com',
                password:'Password@123',
                role:'employee'
            }
            const newUser2={
                name:'John Doe',
                email:'john@test.com',
                password:'Password@123',
                role:'employee'
            };

            await request(app).post('/api/users/v1/user')
                .set('Cookie',`token=${adminToken}`)
                .send(newUser1)
                .expect(201);
            
            const response=await (request(app).post('/api/users/v1/user')
                .set('Cookie',`token=${adminToken}`)
                .send(newUser2)
                .expect(400));

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('The email entered is a duplicate');
        });

        it('should fail with missing required fields',async()=>{
             const newUser={
                email:'john@test.com',
                password:'Password@123',
            };

            const response=(await request(app).post('/api/users/v1/user')
                .set('Cookie',`token=${adminToken}`)
                .send(newUser)
                .expect(400));

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Name is required for user registration');
        });
    });

    describe('GET /api/users/v1/users -Get All Users',()=>{
        it('should get all users as admin',async()=>{
            const response =await request(app)
            .get('/api/users/v1/users')
            .set('Cookie',`token=${adminToken}`)
            .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).not.toHaveProperty('password');
            expect(response.body[0]).not.toHaveProperty('isDeleted');
            expect(response.body[0]).not.toHaveProperty('deletedAt');
            expect(response.body[0]).not.toHaveProperty('_id');
            expect(response.body[0]).not.toHaveProperty('createdAt');
            expect(response.body[0]).not.toHaveProperty('updatedAt');
            expect(response.body[0]).not.toHaveProperty('__v');
            expect(response.body[0]).not.toHaveProperty('isTemporaryPassword');
            expect(response.body[0]).not.toHaveProperty('passwordChangedAt');
        });

        it('should fail to get users as employee',async()=>{
            request(app)
            .get('/api/users/v1/users')
            .set('Cookie',`token=${employeeToken}`)
            .expect(401);
        });

        it('should fail without authentication',async()=>{
            request(app)
            .get('/api/users/v1/users')
            .expect(401);
        });

    });

    describe('GET /api/users/v1/:userid -Get User By Id',()=>{
        it('should get user by ID as admin',async()=>{
            const response =await request(app)
            .get(`/api/users/v1/${employeeUser.userid}`)
            .set('Cookie',`token=${adminToken}`)
            .expect(200);
            
            expect(response.body.userid).toBe(employeeUser.userid);
            expect(response.body.name).toBe(employeeUser.name);
            expect(response.body.email).toBe(employeeUser.email);
            expect(response.body).not.toHaveProperty('password');
            expect(response.body).not.toHaveProperty('isDeleted');
            expect(response.body).not.toHaveProperty('deletedAt');
            expect(response.body).not.toHaveProperty('_id');
            expect(response.body).not.toHaveProperty('createdAt');
            expect(response.body).not.toHaveProperty('updatedAt');
            expect(response.body).not.toHaveProperty('__v');
            expect(response.body).not.toHaveProperty('isTemporaryPassword');
            expect(response.body).not.toHaveProperty('passwordChangedAt');
        });

        it('should allow employee to get their own data',async()=>{
            const response =await request(app)
            .get(`/api/users/v1/${employeeUser.userid}`)
            .set('Cookie',`token=${employeeToken}`)
            .expect(200);

            expect(response.body.userid).toBe(employeeUser.userid);
            expect(response.body).not.toHaveProperty('password');
            expect(response.body).not.toHaveProperty('isDeleted');
            expect(response.body).not.toHaveProperty('deletedAt');
            expect(response.body).not.toHaveProperty('_id');
            expect(response.body).not.toHaveProperty('createdAt');
            expect(response.body).not.toHaveProperty('updatedAt');
            expect(response.body).not.toHaveProperty('__v');
            expect(response.body).not.toHaveProperty('isTemporaryPassword');
            expect(response.body).not.toHaveProperty('passwordChangedAt');
        });

        it('should prevent employee from accessing other user data',async()=>{
            await request(app)
            .get(`/api/users/v1/${adminUser.userid}`)
            .set('Cookie',`token=${employeeToken}`)
            .expect(403)
        });

        it('should fail with invalid user ID format',async()=>{
            const response=await request(app)
            .get('/api/users/v1/ivalid-id')
            .set('Cookie',`token=${adminToken}`)
            .expect(404);

            expect(response.body.message).toContain('There was an error retrieving the information');
        });

        it('should fail with non-existent user ID',async()=>{
            const response=await request(app)
            .get('/api/users/v1/9999999999')
            .set('Cookie',`token=${adminToken}`)
            .expect(404);

            expect(response.body.error).toContain('There is no such user with the id 9999999999');
        });
    });

    describe('PUT /api/users/v1/:userid - Update User',()=>{
        it('should update user as admin',async()=>{
            const updateData={
                name:'Updated Admin Name',
                email:'updated.admin@test.com',
                password:'UpdatedPassword@123'
            };

            const response=await request(app)
            .put(`/api/users/v1/${Number(adminUser.userid)}`)
            .set('Cookie',`token=${adminToken}`)
            .send(updateData)
            .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.email).toBe(updateData.email);
            expect(response.body).not.toHaveProperty('password');
            expect(response.body).not.toHaveProperty('isDeleted');
            expect(response.body).not.toHaveProperty('deletedAt');
            expect(response.body).not.toHaveProperty('_id');
            expect(response.body).not.toHaveProperty('createdAt');
            expect(response.body).not.toHaveProperty('__v');
            expect(response.body).not.toHaveProperty('isTemporaryPassword');
            expect(response.body).not.toHaveProperty('passwordChangedAt');
        });

        it('should allow employee to update their own data',async()=>{
            const updateData={
                name:'Updated employee Name',
                email:'updated.employee@test.com',
                password:'UpdatedPassword@123'
            };

            const response=await request(app)
            .put(`/api/users/v1/${Number(employeeUser.userid)}`)
            .set('Cookie',`token=${employeeToken}`)
            .send(updateData)
            .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.email).toBe(updateData.email);
            expect(response.body).not.toHaveProperty('password');
            expect(response.body).not.toHaveProperty('isDeleted');
            expect(response.body).not.toHaveProperty('deletedAt');
            expect(response.body).not.toHaveProperty('_id');
            expect(response.body).not.toHaveProperty('createdAt');
            expect(response.body).not.toHaveProperty('__v');
            expect(response.body).not.toHaveProperty('isTemporaryPassword');
            expect(response.body).not.toHaveProperty('passwordChangedAt');
        });

        it('should prevent employee from updting other user data',async()=>{
            const updateData={
                name:'Malicious Update',
            };

            await request(app)
            .put(`/api/users/v1/${Number(adminUser.userid)}`)
            .set('Cookie',`token=${employeeToken}`)
            .send(updateData)
            .expect(403);
        });

        it('should fail with invalid email format',async()=>{
            const updateData={
                email:'updated.admintest.com',
            };

            const response=await request(app)
            .put(`/api/users/v1/${Number(adminUser.userid)}`)
            .set('Cookie',`token=${adminToken}`)
            .send(updateData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Please provide a valid email address');
        });

        it('should fail with empty update data',async()=>{
            const response=await request(app)
            .put(`/api/users/v1/${Number(adminUser.userid)}`)
            .set('Cookie',`token=${adminToken}`)
            .send({})
            .expect(400)

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Atleast one field(name or email) is needed for the update');
        });

        it('should fail with invalid password format',async()=>{
            const updateData={
                email:'admin@test.com',
                password:"wertyuhgn"
            }
            const response=await request(app)
            .put(`/api/users/v1/${Number(adminUser.userid)}`)
            .set('Cookie',`token=${adminToken}`)
            .send(updateData)
            .expect(400)
        });

        it('should fail when trying to update restricted fields',async()=>{
            const updateData={
                userid:999,
                role:'admin',
                isDeleted:true
            };

            const response=await request(app)
            .put(`/api/users/v1/${Number(employeeUser.userid)}`)
            .set('Cookie',`token=${adminToken}`)
            .send(updateData)
            .expect(400)

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('The following fields cannot be updated: userid, isDeleted');
        });

    });  
    
    describe('DELETE /api/users/v1/:userid - Delete User',()=>{
        it('should soft delete user as admin',async()=>{
            const userToDelete=await User.create({
                userid:999,
                name:'To Delete',
                email:'delete@test.com',
                password:'Password@123',
                role:'employee'
            });
            const response=await request(app)
            .delete(`/api/users/v1/${Number(userToDelete.userid)}`)
            .set('Cookie',`token=${adminToken}`)
            .expect(200);

            expect(response.body.message).toContain('has been marked as deleted');
            expect(response.body.deletedUser).toBe(userToDelete.name);

            const deletedUser=await User.collection.findOne({userid:userToDelete.userid});
            expect(deletedUser?.isDeleted).toBe(true);
            expect(deletedUser?.deletedAt).toBeDefined();
        });

        it('should fail to delete user as employee',async()=>{
            await request(app)
            .delete(`/api/users/v1/${Number(adminUser.userid)}`)
            .set('Cookie',`token=${employeeToken}`)
            .expect(401);
        });

        it('should fail to delete non-existent user',async()=>{
            const response=await request(app)
            .delete('/api/users/v1/9999')
            .set('Cookie',`token=${adminToken}`)
            .expect(404);

            expect(response.body.error).toContain('The user you are trying to delete does not exist or is already deleted');
        });

        it('should fail to delete already deleted user',async()=>{
            const userToDelete=await User.create({
                userid:998,
                name:'Already deleted',
                email:'alreadydeleted@gmail.com',
                password:"OKOK@123",
                isDeleted:true,
                deletedAt:new Date()
            });

            const response=await request(app)
            .delete(`/api/users/v1/${userToDelete.userid}`)
            .set('Cookie',`token=${adminToken}`)
            .expect(404);

            expect(response.body.error).toContain('The user you are trying to delete does not exist or is already deleted');
        })
    });

    describe('Authentication Middleware Tests',()=>{
        it('should reject requests without token',async()=>{
            await request(app)
            .get('/api/users/v1/users')
            .expect(401);
        });

        it('should reject requests with invalid token',async()=>{
            await request(app)
            .get('/api/users/v1/users')
            .set('Cookie','token=invalid-token')
            .expect(403);
        });

        it('should reject requests with expired token',async()=>{
            const expiredToken=jwt.sign(
                {userid:999,email:'test@test.com',role:'admin',isTemporaryPassword:false},
                process.env.JWT_SECRET!,
                {expiresIn:'-1h'}
            )

            await request(app)
            .get('/api/users/v1/users')
            .set('Cookie',`token=${expiredToken}`)
            .expect(403);
        });

        it('should handle temporary password requirement',async()=>{
            const tempPasswordToken=jwt.sign(
                {userid:998,email:'test@gmail.com',role:'admin',isTemporaryPassword:true},
                process.env.JWT_SECRET!,
                {expiresIn:'24h'}
            );

            const response =await request(app)
            .get('/api/users/v1/users')
            .set('Cookie',`token=${tempPasswordToken}`)
            .expect(400);

            expect(response.body.requiresPasswordChange).toBe(true);
        });
    });

    describe('Validation Edge Cases',()=>{
        it('should handle malformed request bodies',async()=>{
            await request(app)
            .post('/api/users/v1/user')
            .set('Cookie',`token=${adminToken}`)
            .send('invalid json')
            .expect(400);
        });

        it('should validate name with special characters',async()=>{
            const newUser={
                name:'John@Doe#123',
                email:'john@test.com',
                password:'Password@123',
                role:'employee'
            };

            const response=await request(app)
            .post('/api/users/v1/user')
            .set('Cookie',`token=${adminToken}`)
            .send(newUser)
            .expect(400);

            expect(response.body.errors).toContain('Name can only contain letters,spaces and hyphens');
        });

        it('should validate name with consecutive spaces',async()=>{
            const newUser={
                name:'John  Doe',
                email:'john@test@123',
                password:'Password@123',
                role:'employee'
            };

            const response=await request(app)
            .post('/api/users/v1/user')
            .set('Cookie',`token=${adminToken}`)
            .send(newUser)
            .expect(400);

            expect(response.body.errors).toContain('Name cannot contain two consecutive spaces');
        });

        it('should validate password complexity requirements',async()=>{
            const testCases=[
                { password: 'password', expectedError: 'Password must contain atleast one uppercase character' },
                { password: 'PASSWORD123!', expectedError: 'Password must contain atleast one lowercase character' },
                { password: 'Password!', expectedError: 'Password must contain atleast one number' },
                { password: 'Password123', expectedError: 'Password must contain atleast one special character' }
            ];

            for(const testCase of testCases){
                const newUser={
                    name:'John Doe',
                    email:'john@test.com',
                    password:testCase.password,
                    role:'employee'
                };
                const response=await request(app)
                .post('/api/users/v1/user')
                .set('Cookie',`token=${adminToken}`)
                .send(newUser)
                .expect(400);

                expect(response.body.errors).toContain(testCase.expectedError);
            }
        });
    });

    describe('Integration Tests',()=>{
        it('should handle complete user lifecycle',async()=>{
            const newUser = {
                name: 'Lifecycle Test',
                email: 'lifecycle@test.com',
                password: 'Password123!',
                role: 'employee'
            };

            const createResponse=await request(app)
            .post('/api/users/v1/user')
            .set('Cookie',`token=${adminToken}`)
            .send(newUser)
            .expect(201)

            const userId=createResponse.body.data.userid;

            await request(app)
            .get('/api/users/v1/users')
            .set('Cookie',`token=${adminToken}`)
            .expect(200);

            const updateData = { name: 'Updated Lifecycle Test' };
            await request(app)
            .put(`/api/users/v1/${userId}`)
            .set('Cookie', `token=${adminToken}`)
            .send(updateData)
            .expect(200);

            await request(app)
            .delete(`/api/users/v1/${userId}`)
            .set('Cookie', `token=${adminToken}`)
            .expect(200);

            await request(app)
            .get(`/api/users/v1/${userId}`)
            .set('Cookie', `token=${adminToken}`)
            .expect(404);
        })
    });
    describe('User Model Branch Coverage Tests', () => {
    let testUserCounter = 1000;

    const getTestUserId = () => {
        testUserCounter++;
        return testUserCounter;
    };

        describe('Password Hashing Pre-save Hook Coverage', () => {
            it('should not hash password when password is not modified', async () => {
            const hashedPassword = await bcrypt.hash('Password123!', 10);

            const userData = {
                userid: getTestUserId(),
                name: 'Test User',
                email: 'testhash@example.com',
                password: hashedPassword,
                role: 'employee',
                isTemporaryPassword: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await User.collection.insertOne(userData);

            const user = await User.findOne({ userid: userData.userid });
            expect(user).toBeTruthy();
            
            if (user) {
                const originalPassword = user.password;
                user.name = 'Updated Name';
                await user.save();

                expect(user.password).toBe(originalPassword);
            }
            });

            it('should hash password when password is modified on existing user', async () => {
            const user = new User({
                userid: getTestUserId(),
                name: 'Test User',
                email: 'testmodify@example.com',
                password: 'Password123!',
                role: 'employee'
            });
            await user.save();

            const originalPassword = user.password;

            user.password = 'NewPassword123!';
            await user.save();

            expect(user.password).not.toBe(originalPassword);
            expect(user.password).not.toBe('NewPassword123!'); 
            expect(user.isTemporaryPassword).toBe(false);
            expect(user.passwordChangedAt).toBeDefined();
            expect(user.passwordChangedAt).not.toBeNull();
            });

            it('should set default values for new users', async () => {
            const user = new User({
                userid: getTestUserId(),
                name: 'New User',
                email: 'newuser@example.com',
                password: 'Password123!',
                role: 'employee'
            });
            await user.save();

            expect(user.isTemporaryPassword).toBe(true);
            expect(user.passwordChangedAt).toBeNull();
            });
        });
        describe('FindOneAndUpdate Pre-hook Coverage', () => {
        it('should hash password when updating via findOneAndUpdate with password', async () => {
            const initialUser = new User({
                userid: getTestUserId(),
                name: 'Update Test User',
                email: 'updatetest@example.com',
                password: 'Password123!',
                role: 'employee'
            });
            await initialUser.save();

            const originalPassword = initialUser.password;

            const updatedUser = await User.findOneAndUpdate(
                { userid: initialUser.userid },
                { 
                    name: 'Updated Name',
                    password: 'NewPassword123!' 
                },
                { new: true }
            );

            expect(updatedUser).toBeTruthy();
            expect(updatedUser?.password).not.toBe(originalPassword);
            expect(updatedUser?.password).not.toBe('NewPassword123!');
            expect(updatedUser?.name).toBe('Updated Name');
        });

        it('should not hash password when updating via findOneAndUpdate without password', async () => {
            const initialUser = new User({
                userid: getTestUserId(),
                name: 'Update Test User 2',
                email: 'updatetest2@example.com',
                password: 'Password123!',
                role: 'employee'
            });
            await initialUser.save();

            const originalPassword = initialUser.password;

            const updatedUser = await User.findOneAndUpdate(
                { userid: initialUser.userid },
                { name: 'Updated Name Only' },
                { new: true }
            );

            expect(updatedUser).toBeTruthy();
            expect(updatedUser?.password).toBe(originalPassword);
            expect(updatedUser?.name).toBe('Updated Name Only');
        });
        });

        describe('Pre-find Hook Coverage for Soft Delete', () => {
        it('should exclude deleted users from find queries', async () => {
            const user1 = new User({
                userid: getTestUserId(),
                name: 'Active User',
                email: 'active@example.com',
                password: 'Password123!',
                role: 'employee'
            });
            await user1.save();

            const user2 = new User({
                userid: getTestUserId(),
                name: 'To Be Deleted User',
                email: 'deleted@example.com',
                password: 'Password123!',
                role: 'employee'
            });
            await user2.save();

            const initialUsers = await User.find({});
            const initialCount = initialUsers.length;

            await User.collection.updateOne(
                { userid: user2.userid },
                { 
                    $set: { 
                        isDeleted: true, 
                        deletedAt: new Date() 
                    } 
                }
            );

            const activeUsers = await User.find({});
            expect(activeUsers.length).toBe(initialCount - 1);

            const foundDeletedUser = activeUsers.find(u => u.userid === user2.userid);
            expect(foundDeletedUser).toBeUndefined();

            const foundActiveUser = activeUsers.find(u => u.userid === user1.userid);
            expect(foundActiveUser).toBeDefined();
        });

        it('should include users where isDeleted field does not exist', async () => {
            const testUserId = getTestUserId();
            await User.collection.insertOne({
                userid: testUserId,
                name: 'User Without isDeleted Field',
                email: 'nofield@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'employee',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const users = await User.find({});
            const userWithoutField = users.find(u => u.userid === testUserId);
            expect(userWithoutField).toBeDefined();
        });

        it('should include users with isDeleted: false', async () => {
            const user = new User({
                userid: getTestUserId(),
                name: 'Explicitly Not Deleted',
                email: 'notdeleted@example.com',
                password: 'Password123!',
                role: 'employee',
                isDeleted: false
            });
            await user.save();

            const users = await User.find({});
            const foundUser = users.find(u => u.userid === user.userid);
            expect(foundUser).toBeDefined();
            expect(foundUser?.isDeleted).toBe(false);
        });

        it('should work with findOne queries', async () => {
            const user = new User({
                userid: getTestUserId(),
                name: 'FindOne Test User',
                email: 'findone@example.com',
                password: 'Password123!',
                role: 'employee'
            });
            await user.save();

            let foundUser = await User.findOne({ userid: user.userid });
            expect(foundUser).not.toBeNull();

            await User.collection.updateOne(
                { userid: user.userid },
                { 
                    $set: { 
                        isDeleted: true, 
                        deletedAt: new Date() 
                    } 
                }
            );

            foundUser = await User.findOne({ userid: user.userid });
            expect(foundUser).toBeNull();
        });
        });

        describe('Schema Validation Coverage', () => {
        it('should validate email format', async () => {
            const user = new User({
                userid: getTestUserId(),
                name: 'Invalid Email User',
                email: 'invalid-email-format',
                password: 'Password123!',
                role: 'employee'
            });

            let errorThrown = false;
            try {
                await user.save();
            } catch (error: any) {
                errorThrown = true;
                expect(error.name).toBe('ValidationError');
            }
            expect(errorThrown).toBe(true);
        });

        it('should validate password minimum length', async () => {
            const user = new User({
                userid: getTestUserId(),
                name: 'Short Password User',
                email: 'short@example.com',
                password: '123', 
                role: 'employee'
            });

            let errorThrown = false;
            try {
                await user.save();
            } catch (error: any) {
                errorThrown = true;
                expect(error.name).toBe('ValidationError');
            }
            expect(errorThrown).toBe(true);
        });

        it('should validate role enum values', async () => {
            const userData: any = {
                userid: getTestUserId(),
                name: 'Invalid Role User',
                email: 'invalid@example.com',
                password: 'Password123!',
                role: 'invalid-role' 
            };

            const user = new User(userData);

            let errorThrown = false;
            try {
                await user.save();
            } catch (error: any) {
                errorThrown = true;
                expect(error.name).toBe('ValidationError');
            }
            expect(errorThrown).toBe(true);
        });

        it('should set default values correctly', async () => {
            const user = new User({
                userid: getTestUserId(),
                name: 'Default Values User',
                email: 'defaults@example.com',
                password: 'Password123!'
            });
            await user.save();

            expect(user.role).toBe('employee'); 
            expect(user.isTemporaryPassword).toBe(true);
            expect(user.isDeleted).toBe(false);
            expect(user.passwordChangedAt).toBeNull(); 
            expect(user.deletedAt).toBeNull();
            expect(user.createdAt).toBeDefined(); 
            expect(user.updatedAt).toBeDefined();  
        });
        });

        describe('Error Handling Coverage', () => {
        it('should handle duplicate userid', async () => {
            const userid = getTestUserId();

            const user1 = new User({
                userid: userid,
                name: 'First User',
                email: 'first@example.com',
                password: 'Password123!',
                role: 'employee'
            });
            await user1.save();

            const user2 = new User({
                userid: userid, 
                name: 'Second User',
                email: 'second@example.com',
                password: 'Password123!',
                role: 'employee'
            });

            let errorThrown = false;
            try {
                await user2.save();
            } catch (error: any) {
                errorThrown = true;
                expect(error.code).toBe(11000);
            }
            expect(errorThrown).toBe(true);
        });

        it('should handle duplicate email', async () => {
            const email = 'duplicate@example.com';
            
            const user1 = new User({
                userid: getTestUserId(),
                name: 'First User',
                email: email,
                password: 'Password123!',
                role: 'employee'
            });
            await user1.save();

            const user2 = new User({
                userid: getTestUserId(),
                name: 'Second User',
                email: email,
                password: 'Password123!',
                role: 'employee'
            });

            let errorThrown = false;
            try {
                await user2.save();
            } catch (error: any) {
                errorThrown = true;
                expect(error.code).toBe(11000); 
            }
            expect(errorThrown).toBe(true);
        });
        });
    });
});
