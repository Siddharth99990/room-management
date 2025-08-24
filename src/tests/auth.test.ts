import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/user.model';
import { beforeAll, afterAll, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Counter from '../models/counter.model';

describe('Authentication API Test Suite',()=>{
    let mongoServer: MongoMemoryServer;
    let adminUser: any;
    let employeeUser: any;
    let tempPasswordUser: any;
    let adminToken: string;
    let employeeToken: string;
    let tempPasswordToken: string;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        await User.syncIndexes();
        await Counter.create({ _id: 'userid', sequencecounter: 2 });
        await Counter.create({ _id: 'roomid', sequencecounter: 0 });
        await setupTestUsers();
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            if (key !== 'users' && key !== 'counters') {
                await collections[key]?.deleteMany({});
            }
        }
        await setupTestUsers();
    });

    async function setupTestUsers() {
        await User.deleteMany({});

        const hashedAdminPassword = await bcrypt.hash("Adminpassword@123", 10);
        adminUser = await User.collection.insertOne({
            userid: 1,
            name: "Admin user",
            email: "admin@test.com",
            password: hashedAdminPassword,
            role: 'admin',
            isTemporaryPassword: false
        });

        const hashedEmployeePassword = await bcrypt.hash("Employeepassword@123", 10);
        employeeUser = await User.collection.insertOne({
            userid: 2,
            name: "Employee User",
            email: "employee@test.com",
            password: hashedEmployeePassword,
            role: 'employee',
            isTemporaryPassword: false
        });

        const hashedTempPassword=await bcrypt.hash("Temporary@123",10);
        tempPasswordUser=await User.collection.insertOne({
            userid:3,
            name:"Temp password user",
            email:"temp@test.com",
            password:hashedTempPassword,
            role:'employee',
            isTemporaryPassword:true
        });

        const jwtSecret = process.env.JWT_SECRET!;
        adminToken = jwt.sign(
            { userid: adminUser.userid, email: adminUser.email, role: adminUser.role, isTemporaryPassword: false },
            jwtSecret,
            { expiresIn: '24h' }
        );

        employeeToken = jwt.sign(
            { userid: employeeUser.userid, email: employeeUser.email, role: employeeUser.role, isTemporaryPassword: false },
            jwtSecret,
            { expiresIn: '24h' }
        );

        tempPasswordToken = jwt.sign(
            { userid: tempPasswordUser.userid, email: tempPasswordUser.email, role: tempPasswordUser.role, isTemporaryPassword: true },
            jwtSecret,
            { expiresIn: '24h' }
        );
    }

    describe('POST /api/auth/v1/login -User Login',()=>{
        it('should successfully login admin user',async()=>{
            const loginData={
                email:'admin@test.com',
                password:'Adminpassword@123'
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Login Successful');
            expect(response.body.data.user.email).toBe(loginData.email);
            expect(response.body.data.user.role).toBe('admin');
            expect(response.body.data.user).not.toHaveProperty('password');
            expect(response.headers['set-cookie']).toBeDefined();
        });

        it('should successfully login employee user',async()=>{
            const loginData={
                email:"employee@test.com",
                password:'Employeepassword@123'
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Login Successful');
            expect(response.body.data.user.email).toBe(loginData.email);
            expect(response.body.data.user.role).toBe('employee');
            expect(response.body.data.user).not.toHaveProperty('password');
            expect(response.headers['set-cookie']).toBeDefined();
        });

        it('should login with temporary password and require password change',async()=>{
            const loginData={
                email:"temp@test.com",
                password:'Temporary@123'
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('login successful but please change password for all access');
            expect(response.body.data.user.email).toBe(loginData.email);
            expect(response.body.data.user.role).toBe('employee');
            expect(response.body.data.user).not.toHaveProperty('password');
            expect(response.headers['set-cookie']).toBeDefined();
        });

        it('should fail with invalid email',async()=>{
            const loginData={
                email:'nonexistent@test.com',
                password:"Adminpassword@123"
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid email or password');
            expect(response.body.error).toContain('User not found');
        });

        it('should fail with invalid password',async()=>{
            const loginData={
                email:'admin@test.com',
                password:'wrongpassword'
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid email or password');
            expect(response.body.error).toContain('Password mismatch');
        });

        it('should fail with missing email',async()=>{
            const loginData={
                password:"Adminpassword@123"
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Login Validation failed');
            expect(response.body.error).toContain('please enter email');
        });

        it('should fail with missing password',async()=>{
            const loginData={
                email:'admin@test.com'
            }
            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Login validation failed');
            expect(response.body.error).toContain('please enter password');
        });

        it('should fail with invalid email format',async()=>{
            const loginData={
                email:'invalid-email',
                password:'Adminpassword@123'
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Email verification failed');
            expect(response.body.error).toContain('please provide a valid email address');
        });

        it('should fail with short password', async () => {
            const loginData = {
                email: 'admin@test.com',
                password: '123'
            };

            const response = await request(app)
                .post('/api/auth/v1/login')
                .send(loginData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password validation failed');
            expect(response.body.error).toContain('Password length must be atleast 6 characters long');
        });

        it('should fail with too long email',async()=>{
            const longEmail='a'.repeat(250)+'@test.com';
            const loginData={
                email:longEmail,
                password:'Adminpassword@123'
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Email verification failed');
            expect(response.body.error).toContain('Email is too long');
        });

        it('should fail with too long password',async()=>{
            const longPassword='a'.repeat(130);
            const loginData={
                email:"admin@test.com",
                password:longPassword
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password validation failed');
            expect(response.body.error).toContain('Password is too long');
        });

        it('should fail for deleted user',async()=>{
            await User.collection.findOneAndUpdate(
                {email:'admin@test.com'},
                {$set:{isDeleted:true,deletedAt:new Date()}}
            );

            const loginData={
                email:'admin@test.com',
                password:'Adminpassword@123'
            };

            const response=await request(app)
            .post('/api/auth/v1/login')
            .send(loginData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Account is deactivated please contact an admin');
            expect(response.body.error).toContain('Account is deleted');
        });
    });

    describe('PUT /api/auth/v1/changepassword - Change Password',()=>{
        it('should successfully change password for user with temporary password',async()=>{
            const changepasswordData={
                email:'temp@test.com',
                oldPassword:'Temporary@123',
                newPassword:'Newpassword@456'
            };

            const response=await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changepasswordData)
            .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Password changed successfully');
            expect(response.body.data.user.email).toBe(changepasswordData.email);
            expect(response.body.data.user.isTemporaryPassword).toBe(false);
        });

        it('should successfully change password for regular user',async()=>{
            const changePasswordData={
                email:'employee@test.com',
                oldPassword:'Employeepassword@123',
                newPassword:'NewEmployeepassword@123'
            };

            const response=await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changePasswordData)
            .expect(200)

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Password changed successfully');
            expect(response.body.data.user.email).toBe(changePasswordData.email);
            expect(response.body.data.user.isTemporaryPassword).toBe(false);
        });

        it('should fail invalid old password',async()=>{
            const changePasswordData={
                email:'temp@test.com',
                oldPassword:'Temporaryyyyyy@123',
                newPassword:'Temporaryhbjn@123'
            };

            const response=await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changePasswordData)
            .expect(400)

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid Password');
            expect(response.body.error).toContain('Old password does not match');
        });

        it('should fail when new password is same as old password', async () => {
            const changePasswordData = {
                email: 'temp@test.com',
                oldPassword: 'Temporary@123',
                newPassword: 'Temporary@123'
            };

            const response = await request(app)
                .put('/api/auth/v1/changepassword')
                .set('Cookie', `token=${tempPasswordToken}`)
                .send(changePasswordData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password change failed');
            expect(response.body.error).toContain('New password cannot be the same as old password');
        });

        it('should fail with missing email', async () => {
            const changePasswordData = {
                oldPassword: 'Temporary@123',
                newPassword: 'NewPassword@456'
            };

            const response = await request(app)
                .put('/api/auth/v1/changepassword')
                .set('Cookie', `token=${tempPasswordToken}`)
                .send(changePasswordData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password change failed');
            expect(response.body.error).toContain('Email is required for changing password');
        });

        it('should fail with missing old password', async () => {
            const changePasswordData = {
                email: 'temp@test.com',
                newPassword: 'NewPassword@456'
            };

            const response = await request(app)
                .put('/api/auth/v1/changepassword')
                .set('Cookie', `token=${tempPasswordToken}`)
                .send(changePasswordData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password change failed');
            expect(response.body.error).toContain('old password is required to change the password');
        });

        it('should fail with missing old password', async () => {
            const changePasswordData = {
                email: 'temp@test.com',
                newPassword: 'NewPassword@456'
            };

            const response = await request(app)
                .put('/api/auth/v1/changepassword')
                .set('Cookie', `token=${tempPasswordToken}`)
                .send(changePasswordData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password change failed');
            expect(response.body.error).toContain('old password is required to change the password');
        });

        it('should fail with weak new password -no uppercase',async()=>{
            const changePasswordData={
                email:'temp@test.com',
                oldPassword:'Temporary@123',
                newPassword:'newpassword@456'
            };

            const response =await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changePasswordData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password validation failed');
            expect(response.body.error).toContain('Password must contain atleast one uppercase letter');
        });

        it('should fail with weak new password -no number',async()=>{
            const changePasswordData={
                email:'temp@test.com',
                oldPassword:'Temporary@123',
                newPassword:'newpassword@'
            };

            const response =await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changePasswordData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password validation failed');
            expect(response.body.error).toContain('Password must contain atleast one number');
        });

        it('should fail with weak new password -no lowercase',async()=>{
            const changePasswordData={
                email:'temp@test.com',
                oldPassword:'Temporary@123',
                newPassword:'NEWPASSWORD@456'
            };

            const response =await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changePasswordData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password validation failed');
            expect(response.body.error).toContain('Password must contain atleast one lowercase letter');
        });

        it('should fail with weak new password -no special character',async()=>{
            const changePasswordData={
                email:'temp@test.com',
                oldPassword:'Temporary@123',
                newPassword:'Newpassword456'
            };

            const response =await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changePasswordData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password validation failed');
            expect(response.body.error).toContain('Password must contain atleast one special character');
        });

        it('should fail with short new password',async()=>{
            const changePasswordData={
                email:'temp@test.com',
                oldPassword:'Temporary@123',
                newPassword:'New1@'
            };

            const response =await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changePasswordData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Password validation failed');
            expect(response.body.error).toContain('Password must be atleast 6 character long');
        });

        it('should fail for deleted user',async()=>{
            await User.collection.findOneAndUpdate(
                {email:'temp@test.com'},
                {$set:{isDeleted:true,deletedAt:new Date()}}
            );

            const changePasswordData={
                email:'temp@test.com',
                oldPassword:'Temporary@123',
                newPassword:'NewPassword@123'
            };

            const response = await request(app)
                .put('/api/auth/v1/changepassword')
                .set('Cookie', `token=${tempPasswordToken}`)
                .send(changePasswordData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
        });

        it('should fail for non-existent user',async()=>{
            const changePasswordData={
                email:'nonexistent@test.com',
                oldPassword:'Temporary@123',
                newPassword:'NewPassword@456'
            }

            const response=await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${tempPasswordToken}`)
            .send(changePasswordData)
            .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
            expect(response.body.error).toContain('User not found');
        });
    });

    describe('POST /api/auth/v1/logout -User Logout',()=>{
        it('should successfully logout authenticated user',async()=>{
            const response=await request(app)
            .post('/api/auth/v1/logout')
            .set('Cookie',`token=${adminToken}`)
            .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('LogOut successful');
            
            
            const setCookieHeader:any = response.headers['set-cookie'];
            expect(setCookieHeader).toBeDefined();
            expect(setCookieHeader[0]).toContain('token=;');
        });

        it('should successfully logout employee user',async()=>{
            const response=await request(app)
            .post('/api/auth/v1/logout')
            .set('Cookie',`token=${employeeToken}`)
            .expect(200)

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('LogOut successful');
        });

        it('should fail logout without authentication token',async()=>{
            await request(app)
            .post('/api/auth/v1/logout')
            .expect(401);
        });

        it('should fail logout with invalid token',async()=>{
            await request(app)
            .post('/api/auth/v1/logout')
            .set('Cookie',`token=invalid-token`)
            .expect(403);
        });

        it('should fail logout with expired token', async () => {
            const expiredToken = jwt.sign(
                { userid: 999, email: 'test@test.com', role: 'admin', isTemporaryPassword: false },
                process.env.JWT_SECRET!,
                { expiresIn: '-1h' }
            );

            await request(app)
                .post('/api/auth/v1/logout')
                .set('Cookie', `token=${expiredToken}`)
                .expect(403);
        });
    });

    describe('Authentication Middleware Tests',()=>{
        it('should handle malformed JWT token',async()=>{
            await request(app)
            .post('/api/auth/v1/logout')
            .set('Cookie',`token=malformed.token`)
            .expect(403)
        });

        it('should handle token with invalid signature', async () => {
            const invalidToken = jwt.sign(
                { userid: 999, email: 'test@test.com', role: 'admin', isTemporaryPassword: false },
                'wrong-secret',
                { expiresIn: '24h' }
            );

            await request(app)
                .post('/api/auth/v1/logout')
                .set('Cookie', `token=${invalidToken}`)
                .expect(403);
        });

        //  it('should reject token without required fields', async () => {
        //     const incompleteToken = jwt.sign(
        //         { email: 'test@test.com' }, 
        //         process.env.JWT_SECRET!,
        //         { expiresIn: '24h' }
        //     );

        //     await request(app)
        //         .post('/api/auth/v1/logout')
        //         .set('Cookie', `token=${incompleteToken}`)
        //         .expect(403);
        // });
    });

    describe('Integration Tests',()=>{
        it('should handle complete auth lifecycle -login, change password, logout',async()=>{
            const hashedTemporaryPassword=await bcrypt.hash('TempPass@123',10);
            const newUser=await User.collection.insertOne({
                userid:100,
                name:"integration test user",
                email:'integration@test.com',
                password:hashedTemporaryPassword,
                role:'employee',
                isTemporaryPassword:true
            });

            const loginResponse=await request(app)
            .post('/api/auth/v1/login')
            .send({
                email:'integration@test.com',
                password:'TempPass@123'
            }).expect(200);

            expect(loginResponse.body.message).toBe('login successful but please change password for all access');

            const cookies = loginResponse.headers['set-cookie'];
            let tokenCookie: string | undefined;
            if (Array.isArray(cookies)) {
                tokenCookie = cookies.find((cookie: string) => cookie.startsWith('token='));
            } else if (typeof cookies === 'string') {
                tokenCookie = cookies.startsWith('token=') ? cookies : undefined;
            }
            const token=tokenCookie?.split('token=')[1]?.split(';')[0];

            const changePasswordResponse=await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${token}`)
            .send({
                email:'integration@test.com',
                oldPassword:'TempPass@123',
                newPassword:'NewPassword@456'
            }).expect(200);

            expect(changePasswordResponse.body.message).toBe('Password changed successfully');
            expect(changePasswordResponse.body.data.user.isTemporaryPassword).toBe(false);

            const newCookies = changePasswordResponse.headers['set-cookie'];
            let newTokenCookie: string | undefined;
            if (Array.isArray(newCookies)) {
                newTokenCookie = newCookies.find((cookie: string) => cookie.startsWith('token='));
            } else if (typeof newCookies === 'string') {
                newTokenCookie = newCookies.startsWith('token=') ? newCookies : undefined;
            }
            const newToken=newTokenCookie?.split('token=')[1]?.split(';')[0];

            const secondLoginResponse=await request(app)
            .post('/api/auth/v1/login')
            .send({
                email:'integration@test.com',
                password:'NewPassword@456'
            }).expect(200);

            expect(secondLoginResponse.body.message).toBe('Login Successful');

            const logoutResponse=await request(app)
            .post('/api/auth/v1/logout')
            .set('Cookie',`token=${newToken}`)
            .expect(200);

            expect(logoutResponse.body.message).toBe('LogOut successful');
        });

        it('should prevent login with old password after change',async()=>{
            const changePasswordResponse=await request(app)
            .put('/api/auth/v1/changepassword')
            .set('Cookie',`token=${adminToken}`)
            .send({
                email:'admin@test.com',
                oldPassword:'Adminpassword@123',
                newPassword:'NewAdminpassword@456'
            }).expect(200);

            const loginResponse=await request(app)
            .post('/api/auth/v1/login')
            .send({
                email:'admin@test.com',
                password:'Adminpassword@123'
            }).expect(400);

            expect(loginResponse.body.success).toBe(false);
            expect(loginResponse.body.message).toBe('Invalid email or password');

            await request(app)
                .post('/api/auth/v1/login')
                .send({
                    email: 'admin@test.com',
                    password: 'NewAdminpassword@456' 
                })
                .expect(200);
        })
    });
});
