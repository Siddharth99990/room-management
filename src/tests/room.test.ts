import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/user.model';
import Room from '../models/room.model';
import Counter from '../models/counter.model';
import { beforeAll, afterAll, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getNextSequence } from '../../src/utils/getNextSequence';
import { jest } from '@jest/globals';

describe('Room API tests', () => {
    let mongoServer: MongoMemoryServer;
    let adminToken: string;
    let employeeToken: string;
    let adminUser: any;
    let employeeUser: any;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        await User.syncIndexes();
        await Room.syncIndexes();

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
        const hashedAdminPassword = await bcrypt.hash("Adminpassword@123", 10);
        adminUser = await User.create({
            userid: 1,
            name: "Admin user",
            email: "admin@test.com",
            password: hashedAdminPassword,
            role: 'admin',
            isTemporaryPassword: false
        });

        const hashedEmployeePassword = await bcrypt.hash("Employeepassword@123", 10);
        employeeUser = await User.create({
            userid: 2,
            name: "Employee User",
            email: "employee@test.com",
            password: hashedEmployeePassword,
            role: 'employee',
            isTemporaryPassword: false
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
    }

    describe('POST /api/rooms/v1/room - Create Room', () => {
        it('should successfully create a new room as admin', async () => {
            const newRoom = {
                roomname: 'Conference Room A',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard', 'Audio System']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Room created Successfully');
            expect(response.body.data.roomname).toBe(newRoom.roomname);
            expect(response.body.data.roomlocation).toBe(newRoom.roomlocation);
            expect(response.body.data.capacity).toBe(newRoom.capacity);
            expect(response.body.data.equipment).toEqual(newRoom.equipment);
            expect(response.body.data).not.toHaveProperty('__v');
            expect(response.body.data).not.toHaveProperty('_id');
            expect(response.body.data).not.toHaveProperty('updatedAt');
            expect(response.body.data).not.toHaveProperty('isDeleted');
            expect(response.body.data).not.toHaveProperty('deletedAt');
        });

        it('should fail to create room without admin token', async () => {
            const newRoom = {
                roomname: 'Conference Room B',
                roomlocation: '2nd Floor Building B',
                capacity: 15,
                equipment: ['Projector', 'Whiteboard']
            };

            await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${employeeToken}`)
                .send(newRoom)
                .expect(401);
        });

        it('should fail to create room without authentication', async () => {
            const newRoom = {
                roomname: 'Conference Room C',
                roomlocation: '3rd Floor Building C',
                capacity: 25,
                equipment: ['Projector', 'Whiteboard']
            };

            await request(app)
                .post('/api/rooms/v1/room')
                .send(newRoom)
                .expect(401);
        });

        it('should fail with invalid roomname format', async () => {
            const newRoom = {
                roomname: 'Room@#$%',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Roomnames can only contain letters, spaces, hyphens and digits');
        });

        it('should fail with empty roomname', async () => {
            const newRoom = {
                roomname: '',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Roomname should not be empty');
        });

        it('should fail with short roomname', async () => {
            const newRoom = {
                roomname: 'A',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Roomname must have atleast 2 characters');
        });

        it('should fail with consecutive spaces in roomname', async () => {
            const newRoom = {
                roomname: 'Conference  Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Roomname cannot have two consecutive spaces');
        });

        it('should fail with invalid room location', async () => {
            const newRoom = {
                roomname: 'Conference Room A',
                roomlocation: 'Short',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Room location should be atleast 8 characters long');
        });

        it('should fail with empty room location', async () => {
            const newRoom = {
                roomname: 'Conference Room A',
                roomlocation: '',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Room location must be provided');
        });

        it('should fail with invalid capacity - too low', async () => {
            const newRoom = {
                roomname: 'Conference Room A',
                roomlocation: '1st Floor Building A',
                capacity: 3,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Capacity must lie in the range of 4-50');
        });

        it('should fail with invalid capacity - too high', async () => {
            const newRoom = {
                roomname: 'Conference Room A',
                roomlocation: '1st Floor Building A',
                capacity: 60,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Capacity must lie in the range of 4-50');
        });

        it('should fail with non-numeric capacity', async () => {
            const newRoom = {
                roomname: 'Conference Room A',
                roomlocation: '1st Floor Building A',
                capacity: 'twenty',
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Capacity should be provided and should be a number');
        });

        it('should fail with empty equipment array', async () => {
            const newRoom = {
                roomname: 'Conference Room A',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: []
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Equipment is required and cannot be left empty');
        });

        it('should fail with insufficient equipment items', async () => {
            const newRoom = {
                roomname: 'Conference Room A',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Atleast 2 equipment must be mentioned');
        });

        it('should fail with duplicate roomname', async () => {
            const newRoom1 = {
                roomname: 'Conference Room A',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const newRoom2 = {
                roomname: 'Conference Room A',
                roomlocation: '2nd Floor Building B',
                capacity: 15,
                equipment: ['Projector', 'Screen']
            };

            await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom1)
                .expect(201);

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom2)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('The roomname you entered is a duplicate');
        });

        it('should fail with missing required fields', async () => {
            const newRoom = {
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Roomname should not be empty');
        });
    });

    describe('GET /api/rooms/v1/rooms - Get All Rooms', () => {
        beforeEach(async () => {
            await Room.create({
                roomid: 1,
                roomname: 'Test Room 1',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            });

            await Room.create({
                roomid: 2,
                roomname: 'Test Room 2',
                roomlocation: '2nd Floor Building B',
                capacity: 15,
                equipment: ['Screen', 'Audio System']
            });
        });

        it('should get all rooms as admin', async () => {
            const response = await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Successfully fetched the rooms data');
            expect(Array.isArray(response.body.rooms)).toBe(true);
            expect(response.body.rooms.length).toBeGreaterThan(0);
            expect(response.body.rooms[0]).not.toHaveProperty('_id');
            expect(response.body.rooms[0]).not.toHaveProperty('__v');
            expect(response.body.rooms[0]).not.toHaveProperty('createdAt');
            expect(response.body.rooms[0]).not.toHaveProperty('updatedAt');
            expect(response.body.rooms[0]).not.toHaveProperty('isDeleted');
            expect(response.body.rooms[0]).not.toHaveProperty('deletedAt');
        });

        it('should get all rooms as employee', async () => {
            const response = await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', `token=${employeeToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.rooms)).toBe(true);
            expect(response.body.rooms.length).toBeGreaterThan(0);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/api/rooms/v1/rooms')
                .expect(401);
        });

        it('should handle empty rooms list', async () => {
            await Room.deleteMany({});

            const response = await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('There are no rooms created');
        });
    });

    describe('GET /api/rooms/v1/:roomid - Get Room By Id', () => {
        let testRoom: any;

        beforeEach(async () => {
            testRoom = await Room.create({
                roomid: 1,
                roomname: 'Test Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            });
        });

        it('should get room by ID as admin', async () => {
            const response = await request(app)
                .get(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Successfully retrieved room');
            expect(response.body.room.roomid).toBe(testRoom.roomid);
            expect(response.body.room.roomname).toBe(testRoom.roomname);
            expect(response.body.room.roomlocation).toBe(testRoom.roomlocation);
            expect(response.body.room).not.toHaveProperty('_id');
            expect(response.body.room).not.toHaveProperty('__v');
            expect(response.body.room).not.toHaveProperty('createdAt');
            expect(response.body.room).not.toHaveProperty('updatedAt');
            expect(response.body.room).not.toHaveProperty('isDeleted');
            expect(response.body.room).not.toHaveProperty('deletedAt');
        });

        it('should get room by ID as employee', async () => {
            const response = await request(app)
                .get(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${employeeToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.room.roomid).toBe(testRoom.roomid);
        });

        it('should fail with invalid room ID format', async () => {
            const response = await request(app)
                .get('/api/rooms/v1/invalid-id')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Please enter a valid room id');
        });

        it('should fail with non-existent room ID', async () => {
            const response = await request(app)
                .get('/api/rooms/v1/9999')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('The room you are trying to find does not exist');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get(`/api/rooms/v1/${testRoom.roomid}`)
                .expect(401);
        });
    });

    describe('PUT /api/rooms/v1/:roomid - Update Room', () => {
        let testRoom: any;

        beforeEach(async () => {
            testRoom = await Room.create({
                roomid: 1,
                roomname: 'Test Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            });
        });

        it('should update room as admin', async () => {
            const updateData = {
                roomname: 'Updated Test Room',
                roomlocation: '2nd Floor Building B',
                capacity: 25,
                equipment: ['Projector', 'Whiteboard', 'Audio System']
            };

            const response = await request(app)
                .put(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('The room information has been successfully updated');
            expect(response.body.updatedInfo.roomname).toBe(updateData.roomname);
            expect(response.body.updatedInfo.roomlocation).toBe(updateData.roomlocation);
            expect(response.body.updatedInfo.capacity).toBe(updateData.capacity);
            expect(response.body.updatedInfo.equipment).toEqual(updateData.equipment);
        });

        it('should fail to update room as employee', async () => {
            const updateData = {
                roomname: 'Updated Test Room'
            };

            await request(app)
                .put(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${employeeToken}`)
                .send(updateData)
                .expect(401);
        });

        it('should update partial room data', async () => {
            const updateData = {
                roomname: 'Partially Updated Room'
            };

            const response = await request(app)
                .put(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.updatedInfo.roomname).toBe(updateData.roomname);
            expect(response.body.updatedInfo.roomlocation).toBe(testRoom.roomlocation);
        });

        it('should fail with empty update data', async () => {
            const response = await request(app)
                .put(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Atleast one field is needed for updating information');
        });

        it('should fail when trying to update restricted fields', async () => {
            const updateData = {
                roomid: 999,
                _id: 'someobjectid'
            };

            const response = await request(app)
                .put(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('The update body cannot contain the following fields: _id, roomid, isDeleted, deletedAt');
        });

        it('should fail with invalid roomname in update', async () => {
            const updateData = {
                roomname: 'A'
            };

            const response = await request(app)
                .put(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Roomname must have atleast 2 characters');
        });

        it('should fail with invalid capacity in update', async () => {
            const updateData = {
                capacity: 2
            };

            const response = await request(app)
                .put(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Capacity must lie in the range of 4-50');
        });

        it('should fail with non-existent room ID', async () => {
            const updateData = {
                roomname: 'Updated Room'
            };

            const response = await request(app)
                .put('/api/rooms/v1/9999')
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('The room you were trying to update does not exist');
        });
    });

    describe('DELETE /api/rooms/v1/:roomid - Delete Room', () => {
        let testRoom: any;

        beforeEach(async () => {
            testRoom = await Room.create({
                roomid: 1,
                roomname: 'Test Room to Delete',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            });
        });

        it('should soft delete room as admin', async () => {
            const response = await request(app)
                .delete(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('The room has been successfully deleted');
            expect(response.body.deletedroomdata.roomname).toBe(testRoom.roomname);

            const deletedRoom = await Room.collection.findOne({ roomid: testRoom.roomid });
            expect(deletedRoom?.isDeleted).toBe(true);
            expect(deletedRoom?.deletedAt).toBeDefined();
        });

        it('should fail to delete room as employee', async () => {
            await request(app)
                .delete(`/api/rooms/v1/${testRoom.roomid}`)
                .set('Cookie', `token=${employeeToken}`)
                .expect(401);
        });

        it('should fail to delete non-existent room', async () => {
            const response = await request(app)
                .delete('/api/rooms/v1/9999')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('The room you are trying to delete either does not exist or is already deleted');
        });

        it('should fail to delete already deleted room', async () => {
            const deletedRoom = await Room.create({
                roomid: 2,
                roomname: 'Already Deleted Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard'],
                isDeleted: true,
                deletedAt: new Date()
            });

            const response = await request(app)
                .delete(`/api/rooms/v1/${deletedRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('The room you are trying to delete either does not exist or is already deleted');
        });

        it('should fail with invalid room ID format', async () => {
            const response = await request(app)
                .delete('/api/rooms/v1/invalid-id')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('please enter a valid roomid');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .delete(`/api/rooms/v1/${testRoom.roomid}`)
                .expect(401);
        });
    });

    describe('Authentication Middleware Tests', () => {
        it('should reject requests without token', async () => {
            await request(app)
                .get('/api/rooms/v1/rooms')
                .expect(401);
        });

        it('should reject requests with invalid token', async () => {
            await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', 'token=invalid-token')
                .expect(403);
        });

        it('should reject requests with expired token', async () => {
            const expiredToken = jwt.sign(
                { userid: 999, email: 'test@test.com', role: 'admin', isTemporaryPassword: false },
                process.env.JWT_SECRET!,
                { expiresIn: '-1h' }
            );

            await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', `token=${expiredToken}`)
                .expect(403);
        });

        it('should handle temporary password requirement', async () => {
            const tempPasswordToken = jwt.sign(
                { userid: 998, email: 'test@gmail.com', role: 'admin', isTemporaryPassword: true },
                process.env.JWT_SECRET!,
                { expiresIn: '24h' }
            );

            const response = await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', `token=${tempPasswordToken}`)
                .expect(400);

            expect(response.body.requiresPasswordChange).toBe(true);
        });
    });

    describe('Validation Edge Cases', () => {
        // it('should handle malformed request bodies', async () => {
        //     await request(app)
        //         .post('/api/rooms/v1/room')
        //         .set('Cookie', `token=${adminToken}`)
        //         .send('invalid json')
        //         .expect(400);
        // });

        it('should validate roomname with special characters', async () => {
            const newRoom = {
                roomname: 'Room@#$%',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.errors).toContain('Roomnames can only contain letters, spaces, hyphens and digits');
        });

        it('should validate room location with special characters', async () => {
            const newRoom = {
                roomname: 'Test Room',
                roomlocation: 'Floor@#$%',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(400);

            expect(response.body.errors).toContain('Room location can only contain letters,spaces,hyphens and digits');
        });

        it('should validate equipment array with various scenarios', async () => {
            const testCases = [
                { 
                    equipment: null, 
                    expectedError: 'Equipment is required and cannot be left empty' 
                },
                { 
                    equipment: undefined, 
                    expectedError: 'Equipment is required and cannot be left empty' 
                },
                { 
                    equipment: ['Single Item'], 
                    expectedError: 'Atleast 2 equipment must be mentioned' 
                }
            ];

            for (const testCase of testCases) {
                const newRoom = {
                    roomname: 'Test Room',
                    roomlocation: '1st Floor Building A',
                    capacity: 20,
                    equipment: testCase.equipment
                };

                const response = await request(app)
                    .post('/api/rooms/v1/room')
                    .set('Cookie', `token=${adminToken}`)
                    .send(newRoom)
                    .expect(400);

                expect(response.body.errors).toContain(testCase.expectedError);
            }
        });

        it('should validate capacity edge cases', async () => {
            const testCases = [
                { capacity: 0, expectedError: 'Capacity must lie in the range of 4-50' },
                { capacity: -5, expectedError: 'Capacity must lie in the range of 4-50' },
                { capacity: 100, expectedError: 'Capacity must lie in the range of 4-50' },
                { capacity: 'not-a-number', expectedError: 'Capacity should be provided and should be a number' },
                { capacity: null, expectedError: 'Capacity should be provided and should be a number' },
                { capacity: undefined, expectedError: 'Capacity should be provided and should be a number' }
            ];

            for (const testCase of testCases) {
                const newRoom = {
                    roomname: 'Test Room',
                    roomlocation: '1st Floor Building A',
                    capacity: testCase.capacity,
                    equipment: ['Projector', 'Whiteboard']
                };

                const response = await request(app)
                    .post('/api/rooms/v1/room')
                    .set('Cookie', `token=${adminToken}`)
                    .send(newRoom)
                    .expect(400);

                expect(response.body.errors).toContain(testCase.expectedError);
            }
        });

        it('should handle boundary values for capacity', async () => {
            // Test minimum valid capacity
            const minCapacityRoom = {
                roomname: 'Min Capacity Room',
                roomlocation: '1st Floor Building A',
                capacity: 5,
                equipment: ['Projector', 'Whiteboard']
            };

            const minResponse = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(minCapacityRoom)
                .expect(201);

            expect(minResponse.body.success).toBe(true);

            // Test maximum valid capacity
            const maxCapacityRoom = {
                roomname: 'Max Capacity Room',
                roomlocation: '2nd Floor Building B',
                capacity: 50,
                equipment: ['Projector', 'Whiteboard']
            };

            const maxResponse = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(maxCapacityRoom)
                .expect(201);

            expect(maxResponse.body.success).toBe(true);
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete room lifecycle', async () => {
            const newRoom = {
                roomname: 'Lifecycle Test Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard', 'Audio System']
            };

            // Create room
            const createResponse = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(newRoom)
                .expect(201);

            const roomId = createResponse.body.data.roomid;

            // Get all rooms - should include our new room
            const getAllResponse = await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(getAllResponse.body.rooms.some((room: any) => room.roomid === roomId)).toBe(true);

            // Get specific room by ID
            const getByIdResponse = await request(app)
                .get(`/api/rooms/v1/${roomId}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(getByIdResponse.body.room.roomid).toBe(roomId);

            // Update room
            const updateData = { 
                roomname: 'Updated Lifecycle Test Room',
                capacity: 25 
            };
            
            const updateResponse = await request(app)
                .put(`/api/rooms/v1/${roomId}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(updateResponse.body.updatedInfo.roomname).toBe(updateData.roomname);
            expect(updateResponse.body.updatedInfo.capacity).toBe(updateData.capacity);

            // Delete room (soft delete)
            const deleteResponse = await request(app)
                .delete(`/api/rooms/v1/${roomId}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(deleteResponse.body.success).toBe(true);

            // Try to get deleted room - should fail
            await request(app)
                .get(`/api/rooms/v1/${roomId}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);
        });

        it('should handle multiple room creation and management', async () => {
            const rooms = [
                {
                    roomname: 'Conference Room Alpha',
                    roomlocation: '1st Floor East Wing',
                    capacity: 15,
                    equipment: ['Projector', 'Whiteboard']
                },
                {
                    roomname: 'Conference Room Beta',
                    roomlocation: '2nd Floor West Wing',
                    capacity: 25,
                    equipment: ['Smart TV', 'Audio System', 'Video Conferencing']
                },
                {
                    roomname: 'Conference Room Gamma',
                    roomlocation: '3rd Floor Central',
                    capacity: 30,
                    equipment: ['Projector', 'Microphones', 'Speakers']
                }
            ];

            const createdRooms = [];

            // Create multiple rooms
            for (const room of rooms) {
                const response = await request(app)
                    .post('/api/rooms/v1/room')
                    .set('Cookie', `token=${adminToken}`)
                    .send(room)
                    .expect(201);

                createdRooms.push(response.body.data);
            }

            // Verify all rooms were created
            const getAllResponse = await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(getAllResponse.body.rooms.length).toBeGreaterThanOrEqual(3);

            // Update one room
            const roomToUpdate = createdRooms[0];
            const updateData = {
                capacity: 20,
                equipment: ['Projector', 'Whiteboard', 'Audio System']
            };

            await request(app)
                .put(`/api/rooms/v1/${roomToUpdate.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            // Delete another room
            const roomToDelete = createdRooms[1];
            await request(app)
                .delete(`/api/rooms/v1/${roomToDelete.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            // Verify the remaining active rooms
            const finalGetAllResponse = await request(app)
                .get('/api/rooms/v1/rooms')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            const activeRooms = finalGetAllResponse.body.rooms;
            expect(activeRooms.some((room: any) => room.roomid === roomToDelete.roomid)).toBe(false);
            expect(activeRooms.some((room: any) => room.roomid === roomToUpdate.roomid)).toBe(true);
        });

        it('should maintain data consistency across operations', async () => {
            const originalRoom = {
                roomname: 'Consistency Test Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            // Create room
            const createResponse = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(originalRoom)
                .expect(201);

            const roomId = createResponse.body.data.roomid;

            // Verify room data consistency after creation
            expect(createResponse.body.data.roomname).toBe(originalRoom.roomname);
            expect(createResponse.body.data.roomlocation).toBe(originalRoom.roomlocation);
            expect(createResponse.body.data.capacity).toBe(originalRoom.capacity);
            expect(createResponse.body.data.equipment).toEqual(originalRoom.equipment);

            // Get room and verify consistency
            const getResponse = await request(app)
                .get(`/api/rooms/v1/${roomId}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(getResponse.body.room.roomname).toBe(originalRoom.roomname);
            expect(getResponse.body.room.roomlocation).toBe(originalRoom.roomlocation);
            expect(getResponse.body.room.capacity).toBe(originalRoom.capacity);
            expect(getResponse.body.room.equipment).toEqual(originalRoom.equipment);

            // Update room and verify changes are reflected
            const updateData = {
                roomname: 'Updated Consistency Test Room',
                capacity: 25
            };

            const updateResponse = await request(app)
                .put(`/api/rooms/v1/${roomId}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(updateResponse.body.updatedInfo.roomname).toBe(updateData.roomname);
            expect(updateResponse.body.updatedInfo.capacity).toBe(updateData.capacity);
            // Unchanged fields should remain the same
            expect(updateResponse.body.updatedInfo.roomlocation).toBe(originalRoom.roomlocation);
            expect(updateResponse.body.updatedInfo.equipment).toEqual(originalRoom.equipment);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle database connection errors gracefully', async () => {
            const invalidRoom = {
                roomname: 'Test Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['Projector', 'Whiteboard']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(invalidRoom)
                .expect(201);

            expect(response.body.success).toBe(true);
        });

        // it('should handle concurrent room creation attempts', async () => {
        //     const room1 = {
        //         roomname: 'Concurrent Test Room',
        //         roomlocation: '1st Floor Building A',
        //         capacity: 20,
        //         equipment: ['Projector', 'Whiteboard']
        //     };

        //     const room2 = {
        //         roomname: 'Concurrent Test Room', 
        //         roomlocation: '2nd Floor Building B',
        //         capacity: 15,
        //         equipment: ['Screen', 'Audio System']
        //     };
        //     await request(app)
        //         .post('/api/rooms/v1/room')
        //         .set('Cookie', `token=${adminToken}`)
        //         .send(room1)
        //         .expect(201);

        //     const response = await request(app)
        //         .post('/api/rooms/v1/room')
        //         .set('Cookie', `token=${adminToken}`)
        //         .send(room2)
        //         .expect(400);

        //     expect(response.body.success).toBe(false);
        //     expect(response.body.errors).toBe('The roomname you entered is a duplicate');
        // });

        it('should handle malformed JSON in request body', async () => {
            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect(400);

            expect(response.status).toBe(400);
        });

        it('should handle very large equipment arrays', async () => {
            const largeEquipmentArray = Array.from({ length: 100 }, (_, i) => `Equipment ${i + 1}`);
            
            const roomWithLargeEquipment = {
                roomname: 'Large Equipment Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: largeEquipmentArray
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(roomWithLargeEquipment)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.equipment).toHaveLength(100);
        });

        it('should handle special characters in equipment names', async () => {
            const roomWithSpecialEquipment = {
                roomname: 'Special Equipment Room',
                roomlocation: '1st Floor Building A',
                capacity: 20,
                equipment: ['65" 4K Display', 'Wi-Fi 6 Router', 'USB-C Hub']
            };

            const response = await request(app)
                .post('/api/rooms/v1/room')
                .set('Cookie', `token=${adminToken}`)
                .send(roomWithSpecialEquipment)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.equipment).toEqual(roomWithSpecialEquipment.equipment);
        });
    });
});
   