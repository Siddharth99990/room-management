import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/user.model';
import { beforeAll, afterAll, describe, it, expect, beforeEach } from '@jest/globals';
import Counter from '../models/counter.model';
import Room from '../models/room.model';
import Booking from '../models/booking.model';

describe('Booking API Test Suite', () => {
    let mongoServer: MongoMemoryServer;
    let adminUser: any;
    let employeeUser: any;
    let employee2User: any;
    let tempPasswordUser: any;
    let adminToken: string;
    let employeeToken: string;
    let employee2Token: string;
    let tempPasswordToken: string;
    let testRoom: any;
    let testRoom2: any;
    let testBooking: any;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        await User.syncIndexes();
        await Room.syncIndexes();
        await Booking.syncIndexes();
        await Counter.create({ _id: 'userid', sequencecounter: 4 });
        await Counter.create({ _id: 'roomid', sequencecounter: 2 });
        await Counter.create({ _id: 'bookingid', sequencecounter: 0 });
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            if (key !== 'users' && key !== 'counters' && key !== 'rooms') {
                await collections[key]?.deleteMany({});
            }
        }
        await setupTestUsers();
        await setupTestRooms();
    });

    async function setupTestUsers() {
        await User.deleteMany({});

        const hashedAdminPassword = await bcrypt.hash("Adminpassword@123", 10);
        adminUser = await User.collection.insertOne({
            userid: 1,
            name: "Admin User",
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

        const hashedEmployee2Password = await bcrypt.hash("Employee2password@123", 10);
        employee2User = await User.collection.insertOne({
            userid: 3,
            name: "Employee User 2",
            email: "employee2@test.com",
            password: hashedEmployee2Password,
            role: 'employee',
            isTemporaryPassword: false
        });

        const hashedTempPassword = await bcrypt.hash("Temppassword@123", 10);
        tempPasswordUser = await User.collection.insertOne({
            userid: 4,
            name: "Temp User",
            email: "temp@test.com",
            password: hashedTempPassword,
            role: 'employee',
            isTemporaryPassword: true
        });

        const jwtSecret = process.env.JWT_SECRET!;
        adminToken = jwt.sign(
            { userid: 1, email: 'admin@test.com', role: 'admin', isTemporaryPassword: false },
            jwtSecret,
            { expiresIn: '24h' }
        );

        employeeToken = jwt.sign(
            { userid: 2, email: 'employee@test.com', role: 'employee', isTemporaryPassword: false },
            jwtSecret,
            { expiresIn: '24h' }
        );

        employee2Token = jwt.sign(
            { userid: 3, email: 'employee2@test.com', role: 'employee', isTemporaryPassword: false },
            jwtSecret,
            { expiresIn: '24h' }
        );

        tempPasswordToken = jwt.sign(
            { userid: 4, email: 'temp@test.com', role: 'employee', isTemporaryPassword: true },
            jwtSecret,
            { expiresIn: '24h' }
        );
    }

    async function setupTestRooms() {
        await Room.deleteMany({});

        testRoom = await Room.create({
            roomid: 1,
            roomname: 'Test Room 1',
            roomlocation: 'Floor 1, Building A',
            capacity: 10,
            equipment: ['Projector', 'Whiteboard']
        });

        testRoom2 = await Room.create({
            roomid: 2,
            roomname: 'Test Room 2',
            roomlocation: 'Floor 2, Building A',
            capacity: 5,
            equipment: ['TV', 'Conference Phone']
        });
    }

    async function setupTestBookings() {
        await Booking.deleteMany({});

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2);
        tomorrow.setHours(14, 0, 0, 0);

        const endtime = new Date(tomorrow);
        endtime.setHours(15, 0, 0, 0);

        testBooking = await Booking.create({
            bookingid: 1,
            starttime: tomorrow,
            endtime: endtime,
            roomid: testRoom.roomid,
            createdBy: { userid: 1, name: "Admin User" },
            attendees: [
                { userid: 2, name: "Employee User", status: 'invited' }
            ]
        });
    }

    describe('POST /api/booking/v1/booking - Create Booking', () => {
        it('should successfully create a new booking as admin', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(13, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(14, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid,
                attendees: [
                    {
                        userid: 2,
                        name: "Employee User",
                        status: 'invited'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                
                console.log(response.body);
                console.log(response.headers);
                console.log(response.text);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Room has been booked');
            expect(response.body.data.bookingid).toBeDefined();
            expect(response.body.data.roomid.roomname).toBe(testRoom.roomname);
            expect(response.body.data.createdBy.userid).toBe(1);
            expect(response.body.data.attendees).toHaveLength(1);
            expect(response.body.data).not.toHaveProperty('_id');
            expect(response.body.data).not.toHaveProperty('__v');
        });

        it('should successfully create a booking as employee', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(10, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${employeeToken}`)
                .send(bookingData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.createdBy.userid).toBe(2);
        });

        it('should create booking with multiple attendees', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(13, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(14, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid,
                attendees: [
                    {
                        userid: 2,
                        name: "Employee User",
                        status: 'invited'
                    },
                    {
                        userid: 3,
                        name: "Employee User 2",
                        status: 'accepted'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.attendees).toHaveLength(2);
        });

        it('should fail with conflicting time slot', async () => {
           const existingStart = new Date();
            existingStart.setDate(existingStart.getDate() + 2);
            existingStart.setHours(14, 0, 0, 0);

            const existingEnd = new Date(existingStart);
            existingEnd.setHours(15, 0, 0, 0);

            await Booking.create({
                bookingid: 1,
                starttime: existingStart,
                endtime: existingEnd,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [
                    { userid: 2, name: "Employee User", status: 'invited' }
                ]
            });

            const conflictStart = new Date();
            conflictStart.setDate(conflictStart.getDate() + 2);
            conflictStart.setHours(14, 30, 0, 0);

            const conflictEnd = new Date(conflictStart);
            conflictEnd.setHours(15, 30, 0, 0);

            const bookingData = {
                starttime: conflictStart.toISOString(),
                endtime: conflictEnd.toISOString(),
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Time slot conflicts with existing booking');
        });

        it('should fail with past date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(10, 0, 0, 0);

            const endtime = new Date(yesterday);
            endtime.setHours(11, 0, 0, 0);

            const bookingData = {
                starttime: yesterday.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('validation failed');
        });

        it('should fail with invalid room ID', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: 999
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Room not found');
        });

        it('should fail with start time after end time', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(11, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(10, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Time range validation failed');
        });

        it('should fail with meeting duration over 8 hours', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(18, 0, 0, 0); // 9 hours

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('The meeting duration cannot exceed 8 hours');
        });

        it('should fail with meeting duration under 15 minutes', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(10, 10, 0, 0); // 10 minutes

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('The meeting duration cannot be less than 15 minutes');
        });

        it('should fail with attendees exceeding room capacity', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const attendees = Array.from({ length: 11 }, (_, i) => ({
                userid: i + 1,
                name: `User ${i + 1}`,
                status: 'invited'
            }));

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid,
                attendees
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain(`Maximum ${testRoom.capacity} attendees are allowed per booking`);
        });

        it('should fail with duplicate attendees', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid,
                attendees: [
                    { userid: 2, name: "Employee User", status: 'invited' },
                    { userid: 2, name: "Employee User", status: 'accepted' }
                ]
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('Duplicate attendees are not allowed');
        });

        it('should fail with non-existent attendee', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid,
                attendees: [
                    { userid: 999, name: "Non-existent User", status: 'invited' }
                ]
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Attendee with ID 999 not found');
        });

        it('should fail without authentication', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            await request(app)
                .post('/api/booking/v1/booking')
                .send(bookingData)
                .expect(401);
        });

        it('should fail with temporary password', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const bookingData = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${tempPasswordToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('change password to access');
            expect(response.body.requiresPasswordChange).toBe(true);
        });

        it('should fail with missing required fields', async () => {
            const bookingData = {
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('validation failed');
        });
    });

    describe('GET /api/booking/v1/bookings - Get All Bookings', () => {
        it('should successfully get all bookings as admin', async () => {

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            tomorrow.setHours(14, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(15, 0, 0, 0);

            testBooking = await Booking.create({
                bookingid: 1,
                starttime: tomorrow,
                endtime: endtime,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [
                    { userid: 2, name: "Employee User", status: 'invited' }
                ]
            });

            const response = await request(app)
                .get('/api/booking/v1/bookings')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Successfully fetched all bookings');
            expect(response.body.bookings).toHaveLength(1);
            expect(response.body.pagination.totalBookings).toBe(1);
            expect(response.body.pagination.currentpage).toBe(1);
            expect(response.body.pagination.totalpages).toBe(1);
        });

        it('should filter bookings by room ID', async () => {

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            tomorrow.setHours(14, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(15, 0, 0, 0);

            testBooking = await Booking.create({
                bookingid: 1,
                starttime: tomorrow,
                endtime: endtime,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [
                    { userid: 2, name: "Employee User", status: 'invited' }
                ]
            });

            const response = await request(app)
                .get(`/api/booking/v1/bookings?roomid=${testRoom.roomid}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.bookings).toHaveLength(1);
            expect(response.body.bookings[0].roomid.roomid).toBe(testRoom.roomid);
        });

        it('should filter bookings by creator', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            tomorrow.setHours(14, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(15, 0, 0, 0);

            testBooking = await Booking.create({
                bookingid: 1,
                starttime: tomorrow,
                endtime: endtime,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [
                    { userid: 2, name: "Employee User", status: 'invited' }
                ]
            });

            const response = await request(app)
                .get('/api/booking/v1/bookings?createdBy=1')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.bookings).toHaveLength(1);
            expect(response.body.bookings[0].createdBy.userid).toBe(1);
        });

        it('should filter bookings by status', async () => {

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            tomorrow.setHours(14, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(15, 0, 0, 0);

            testBooking = await Booking.create({
                bookingid: 1,
                starttime: tomorrow,
                endtime: endtime,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [
                    { userid: 2, name: "Employee User", status: 'invited' }
                ]
            });

            const response = await request(app)
                .get('/api/booking/v1/bookings?status=confirmed')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.bookings).toHaveLength(1);
            expect(response.body.bookings[0].status).toBe('confirmed');
        });

        it('should filter bookings by date', async () => {

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            tomorrow.setHours(14, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(15, 0, 0, 0);

            testBooking = await Booking.create({
                bookingid: 1,
                starttime: tomorrow,
                endtime: endtime,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [
                    { userid: 2, name: "Employee User", status: 'invited' }
                ]
            });

            const testDate = new Date();
            testDate.setDate(testDate.getDate() + 2);
            
            const response = await request(app)
                .get(`/api/booking/v1/bookings?date=${testDate.toISOString().split('T')[0]}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.bookings).toHaveLength(1);
        });

        it('should handle pagination correctly', async () => {
            // Create additional bookings for pagination test
            const bookingPromises = [];
            for (let i = 0; i < 5; i++) {
                const starttime = new Date();
                starttime.setDate(starttime.getDate() + 3 + i);
                starttime.setHours(10, 0, 0, 0);

                const endtime = new Date(starttime);
                endtime.setHours(11, 0, 0, 0);

                bookingPromises.push(Booking.create({
                    bookingid: i + 2,
                    starttime,
                    endtime,
                    roomid: testRoom2.roomid,
                    createdBy: { userid: 2, name: "Employee User" },
                    attendees: []
                }));
            }
            await Promise.all(bookingPromises);

            const response = await request(app)
                .get('/api/booking/v1/bookings?page=1&limit=3')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.bookings).toHaveLength(3);
            expect(response.body.pagination.currentpage).toBe(1);
            expect(response.body.pagination.totalBookings).toBe(5);
            expect(response.body.pagination.totalpages).toBe(2);
        });

        // it('should sort bookings correctly', async () => {
        //     // Create additional booking
        //     const starttime = new Date();
        //     starttime.setDate(starttime.getDate() + 1);
        //     starttime.setHours(9, 0, 0, 0);

        //     const endtime = new Date(starttime);
        //     endtime.setHours(10, 0, 0, 0);

        //     await Booking.create({
        //         bookingid: 2,
        //         starttime,
        //         endtime,
        //         roomid: testRoom2.roomid,
        //         createdBy: { userid: 2, name: "Employee User" },
        //         attendees: []
        //     });

        //     const response = await request(app)
        //         .get('/api/booking/v1/bookings?sortBy=starttime&sortOrder=asc')
        //         .set('Cookie', `token=${adminToken}`)
        //         .expect(200);

        //     expect(response.body.success).toBe(true);
        //     expect(response.body.bookings).toHaveLength(2);
        //     expect(new Date(response.body.bookings[0].starttime))
        //         .toBeLessThan(new Date(response.body.bookings[1].starttime));
        // });

        it('should fail with invalid room ID format', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings?roomid=invalid')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid roomid, roomid must be a number');
        });

        it('should fail with invalid status', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings?status=invalid')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid status');
        });

        it('should fail with invalid date format', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings?date=invalid-date')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid date format please enter date in proper format');
        });

        it('should fail with invalid page number', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings?page=-1')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Page number cannot be less than 1');
        });

        it('should fail with invalid limit', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings?limit=101')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Limit cannot be less than 0 or greater than 100');
        });

        it('should fail with invalid sort field', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings?sortBy=invalidField')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid sortBy field');
        });

        it('should fail with invalid sort order', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings?sortOrder=invalid')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('sortOrder must be either asc or desc');
        });

        it('should fail with start time after end time in filter', async () => {
            const starttime = new Date();
            starttime.setDate(starttime.getDate() + 1);
            const endtime = new Date();
            endtime.setDate(endtime.getDate() + 1);
            endtime.setHours(starttime.getHours() - 1);

            const response = await request(app)
                .get(`/api/booking/v1/bookings?starttime=${starttime.toISOString()}&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Start time must be before end time');
        });

        it('should return empty result with message when no bookings match filter', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings?roomid=999')
                .set('Cookie', `token=${adminToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('There was an error fetching bookings');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/api/booking/v1/bookings')
                .expect(401);
        });

        it('should fail with temporary password', async () => {
            const response = await request(app)
                .get('/api/booking/v1/bookings')
                .set('Cookie', `token=${tempPasswordToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('change password to access');
        });
    });

    describe('GET /api/booking/v1/:bookingid - Get Booking by ID', () => {
        it('should successfully get booking by ID as admin', async () => {
            await setupTestBookings();

            const response = await request(app)
                .get(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Successfully fetched the booking');
            expect(response.body.booking.bookingid).toBe(testBooking.bookingid);
            expect(response.body.booking.roomid).toBe(testBooking.roomid);
            expect(response.body.booking.createdBy.userid).toBe(1);
            expect(response.body.booking).not.toHaveProperty('_id');
            expect(response.body.booking).not.toHaveProperty('__v');
        });

        it('should successfully get booking by ID as employee', async () => {
            await setupTestBookings();

            const response = await request(app)
                .get(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${employeeToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.booking.bookingid).toBe(testBooking.bookingid);
        });

        it('should fail with non-existent booking ID', async () => {
            const response = await request(app)
                .get('/api/booking/v1/999')
                .set('Cookie', `token=${adminToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('There was an error fetching the booking');
            expect(response.body.error).toBe('The Booking you are trying to find either does not exist or is cancelled');
        });

        it('should fail with invalid booking ID format', async () => {
            const response = await request(app)
                .get('/api/booking/v1/invalid')
                .set('Cookie', `token=${adminToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('There was an error fetching the booking');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/api/booking/v1/1')
                .expect(401);
        });

        it('should fail with temporary password', async () => {
            const response = await request(app)
                .get('/api/booking/v1/1')
                .set('Cookie', `token=${tempPasswordToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('change password to access');
            expect(response.body.requiresPasswordChange).toBe(true);
        });
    });

    describe('PUT /api/booking/v1/:bookingid - Update Booking Status and Timings', () => {
        it('should successfully update booking status as creator', async () => {
            await setupTestBookings();

            const updateData = {
                status: 'cancelled'
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('The booking details have been successfully updated');
            expect(response.body.data.status).toBe('cancelled');
            expect(response.body.data.bookingid).toBe(testBooking.bookingid);
        });

        it('should successfully update booking timings as creator', async () => {
            await setupTestBookings();

            const newStartTime = new Date();
            newStartTime.setDate(newStartTime.getDate() + 3);
            newStartTime.setHours(10, 0, 0, 0);

            const newEndTime = new Date(newStartTime);
            newEndTime.setHours(11, 0, 0, 0);

            const updateData = {
                starttime: newStartTime.toISOString(),
                endtime: newEndTime.toISOString()
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.starttime).toBe(newStartTime.toISOString());
            expect(response.body.data.endtime).toBe(newEndTime.toISOString());
        });

        it('should successfully update room ID as creator', async () => {
            await setupTestBookings();

            const updateData = {
                roomid: testRoom2.roomid
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.roomid).toBe(testRoom2.roomid);
        });

        it('should successfully update attendees as creator', async () => {
            await setupTestBookings();

            const updateData = {
                attendees: [
                    { userid: 2, name: "Employee User", status: 'accepted' },
                    { userid: 3, name: "Employee User 2", status: 'invited' }
                ]
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.attendees).toHaveLength(2);
            expect(response.body.data.attendees[0].status).toBe('accepted');
        });

        it('should successfully update multiple fields as creator', async () => {
            await setupTestBookings();

            const newStartTime = new Date();
            newStartTime.setDate(newStartTime.getDate() + 4);
            newStartTime.setHours(13, 0, 0, 0);

            const newEndTime = new Date(newStartTime);
            newEndTime.setHours(14, 30, 0, 0);

            const updateData = {
                starttime: newStartTime.toISOString(),
                endtime: newEndTime.toISOString(),
                roomid: testRoom2.roomid,
                attendees: [
                    { userid: 3, name: "Employee User 2", status: 'invited' }
                ]
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.roomid).toBe(testRoom2.roomid);
            expect(response.body.data.attendees).toHaveLength(1);
        });

        it('should fail when non-creator tries to update booking', async () => {
            await setupTestBookings();

            const updateData = {
                status: 'cancelled'
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${employeeToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('There was an error updating booking details');
            expect(response.body.error).toBe('Bookings can only be updated by the creator');
        });

        it('should fail with non-existent booking ID', async () => {
            const updateData = {
                status: 'cancelled'
            };

            const response = await request(app)
                .put('/api/booking/v1/999')
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('There was an error updating booking details');
            expect(response.body.error).toBe('The booking you are trying to update either does not exist or is cancelled');
        });

        it('should fail with conflicting timings', async () => {
            await setupTestBookings();

            const conflictStart = new Date();
            conflictStart.setDate(conflictStart.getDate() + 5);
            conflictStart.setHours(10, 0, 0, 0);

            const conflictEnd = new Date(conflictStart);
            conflictEnd.setHours(11, 0, 0, 0);

            await Booking.create({
                bookingid: 2,
                starttime: conflictStart,
                endtime: conflictEnd,
                roomid: testRoom.roomid,
                createdBy: { userid: 2, name: "Employee User" },
                attendees: []
            });

            const updateData = {
                starttime: conflictStart.toISOString(),
                endtime: conflictEnd.toISOString()
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Updated timings conflict with another booking');
        });

        it('should fail with invalid status', async () => {
            await setupTestBookings();

            const updateData = {
                status: 'invalid_status'
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('There was an error updating booking details');
            expect(response.body.error).toContain('Invalid status provided');
        });

        it('should fail with invalid room ID', async () => {
            await setupTestBookings();

            const updateData = {
                roomid: 999
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('There was an error updating booking details');
            expect(response.body.error).toContain('The room you are trying to book does not exist');
        });

        it('should fail with past date', async () => {
            await setupTestBookings();

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            pastDate.setHours(10, 0, 0, 0);

            const pastEndDate = new Date(pastDate);
            pastEndDate.setHours(11, 0, 0, 0);

            const updateData = {
                starttime: pastDate.toISOString(),
                endtime: pastEndDate.toISOString()
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('There was an error updating booking details');
            expect(response.body.error).toContain('Start time date must be either higher or current date cannot be of past');
        });

        it('should fail with start time after end time', async () => {
            await setupTestBookings();

            const startTime = new Date();
            startTime.setDate(startTime.getDate() + 3);
            startTime.setHours(15, 0, 0, 0);

            const endTime = new Date(startTime);
            endTime.setHours(14, 0, 0, 0);

            const updateData = {
                starttime: startTime.toISOString(),
                endtime: endTime.toISOString()
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Start time cannot be after end time');
        });

        it('should fail with meeting duration over 8 hours', async () => {
            await setupTestBookings();

            const startTime = new Date();
            startTime.setDate(startTime.getDate() + 3);
            startTime.setHours(9, 0, 0, 0);

            const endTime = new Date(startTime);
            endTime.setHours(18, 0, 0, 0); 

            const updateData = {
                starttime: startTime.toISOString(),
                endtime: endTime.toISOString()
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('The meeting duration cannot exceed 8 hours');
        });

        it('should fail with meeting duration under 15 minutes', async () => {
            await setupTestBookings();

            const startTime = new Date();
            startTime.setDate(startTime.getDate() + 3);
            startTime.setHours(10, 0, 0, 0);

            const endTime = new Date(startTime);
            endTime.setHours(10, 10, 0, 0); 

            const updateData = {
                starttime: startTime.toISOString(),
                endtime: endTime.toISOString()
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('The meeting duration cannot be less than 15 minutes');
        });

        it('should fail with attendees exceeding room capacity', async () => {
            await setupTestBookings();

            const attendees = Array.from({ length: 11 }, (_, i) => ({
                userid: i + 1,
                name: `User ${i + 1}`,
                status: 'invited'
            }));

            const updateData = {
                attendees
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain(`Maximum ${testRoom.capacity} attendees are allowed per booking`);
        });

        it('should fail with duplicate attendees', async () => {
            await setupTestBookings();

            const updateData = {
                attendees: [
                    { userid: 2, name: "Employee User", status: 'invited' },
                    { userid: 2, name: "Employee User", status: 'accepted' }
                ]
            };

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Duplicate attendees are not allowed');
        });

        it('should fail with empty update data', async () => {
            await setupTestBookings();

            const updateData = {};

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Atleast one field is required for update');
        });

        it('should fail without authentication', async () => {
            const updateData = {
                status: 'cancelled'
            };

            await request(app)
                .put('/api/booking/v1/1')
                .send(updateData)
                .expect(401);
        });

        it('should fail with temporary password', async () => {
            const updateData = {
                status: 'cancelled'
            };

            const response = await request(app)
                .put('/api/booking/v1/1')
                .set('Cookie', `token=${tempPasswordToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('change password to access');
            expect(response.body.requiresPasswordChange).toBe(true);
        });

        it('should fail when user is not authenticated', async () => {
            await setupTestBookings();

            const updateData = {
                status: 'cancelled'
            };

            const invalidToken = jwt.sign(
                { email: 'test@test.com', role: 'employee' },
                process.env.JWT_SECRET!,
                { expiresIn: '24h' }
            );

            const response = await request(app)
                .put(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${invalidToken}`)
                .send(updateData)
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Unauthoried user not authorized');
        });
    });

    describe('Edge Cases and Integration Tests', () => {
        it('should handle concurrent booking attempts correctly', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(16, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(17, 0, 0, 0);

            const bookingData1 = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            const bookingData2 = {
                starttime: tomorrow.toISOString(),
                endtime: endtime.toISOString(),
                roomid: testRoom.roomid
            };

            const [response1, response2] = await Promise.allSettled([
                request(app)
                    .post('/api/booking/v1/booking')
                    .set('Cookie', `token=${adminToken}`)
                    .send(bookingData1),
                request(app)
                    .post('/api/booking/v1/booking')
                    .set('Cookie', `token=${employeeToken}`)
                    .send(bookingData2)
            ]);

            const results = [response1, response2].map(r => 
                r.status === 'fulfilled' ? r.value : null
            ).filter(Boolean);

            const successCount = results.filter(r => r?.body?.success === true).length;
            const conflictCount = results.filter(r => r?.body?.success === false && r?.status === 409).length;

            expect(successCount).toBe(1);
            expect(conflictCount).toBe(1);
        });

        it('should handle complex date filtering correctly', async () => {
            const today = new Date();
            const bookingsData = [];

            for (let i = 1; i <= 3; i++) {
                const starttime = new Date(today);
                starttime.setDate(today.getDate() + i);
                starttime.setHours(10, 0, 0, 0);

                const endtime = new Date(starttime);
                endtime.setHours(11, 0, 0, 0);

                await Booking.create({
                    bookingid: i,
                    starttime,
                    endtime,
                    roomid: i === 1 ? testRoom.roomid : testRoom2.roomid,
                    createdBy: { userid: 1, name: "Admin User" },
                    attendees: []
                });
            }
            
            const filterDate = new Date(today);
            filterDate.setDate(today.getDate() + 2);

            const response = await request(app)
                .get(`/api/booking/v1/bookings?date=${filterDate.toISOString().split('T')[0]}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.bookings).toHaveLength(1);
            expect(response.body.bookings[0].bookingid).toBe(2);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should properly clean up attendee data in responses', async () => {
            await setupTestBookings();

            const response = await request(app)
                .get(`/api/booking/v1/${testBooking.bookingid}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.booking.attendees[0]).not.toHaveProperty('_id');
            expect(response.body.booking.attendees[0]).not.toHaveProperty('acceptedAt');
        });

        it('should handle timezone considerations correctly', async () => {
            const utcDate = new Date();
            utcDate.setUTCDate(utcDate.getUTCDate() + 1);
            utcDate.setUTCHours(14, 0, 0, 0);

            const endDate = new Date(utcDate);
            endDate.setUTCHours(15, 0, 0, 0);

            const bookingData = {
                starttime: utcDate.toISOString(),
                endtime: endDate.toISOString(),
                roomid: testRoom.roomid
            };

            const response = await request(app)
                .post('/api/booking/v1/booking')
                .set('Cookie', `token=${adminToken}`)
                .send(bookingData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(new Date(response.body.data.starttime).toISOString()).toBe(utcDate.toISOString());
        });
    });

    describe('GET /api/booking/v1/availablerooms - Get Available Rooms', () => {
        it('should successfully get available rooms as admin', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${tomorrow.toISOString()}&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('These are the available rooms');
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0]).toHaveProperty('roomid');
            expect(response.body.data[0]).toHaveProperty('roomname');
            expect(response.body.data[0]).toHaveProperty('capacity');
            expect(response.body.data[0]).not.toHaveProperty('_id');
            expect(response.body.data[0]).not.toHaveProperty('__v');
            expect(response.body.data[0]).not.toHaveProperty('isDeleted');
        });

        it('should successfully get available rooms as employee', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(10, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${tomorrow.toISOString()}&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${employeeToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.some((room:any) => room.roomid === testRoom.roomid)).toBe(true);
            expect(response.body.data.some((room:any) => room.roomid === testRoom2.roomid)).toBe(true);
        });

        it('should exclude rooms with confirmed bookings in the time slot', async () => {
            const conflictStart = new Date();
            conflictStart.setDate(conflictStart.getDate() + 2);
            conflictStart.setHours(14, 0, 0, 0);

            const conflictEnd = new Date(conflictStart);
            conflictEnd.setHours(15, 0, 0, 0);

            await Booking.create({
                bookingid: 1,
                starttime: conflictStart,
                endtime: conflictEnd,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [],
                status: 'confirmed'
            });

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${conflictStart.toISOString()}&endtime=${conflictEnd.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].roomid).toBe(testRoom2.roomid);
            expect(response.body.data.some((room:any) => room.roomid === testRoom.roomid)).toBe(false);
        });

        it('should include rooms with cancelled bookings', async () => {
            const conflictStart = new Date();
            conflictStart.setDate(conflictStart.getDate() + 3);
            conflictStart.setHours(14, 0, 0, 0);

            const conflictEnd = new Date(conflictStart);
            conflictEnd.setHours(15, 0, 0, 0);

            await Booking.create({
                bookingid: 1,
                starttime: conflictStart,
                endtime: conflictEnd,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [],
                status: 'cancelled'
            });

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${conflictStart.toISOString()}&endtime=${conflictEnd.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.some((room:any) => room.roomid === testRoom.roomid)).toBe(true);
        });

        it('should handle overlapping time slots correctly', async () => {
            const existingStart = new Date();
            existingStart.setDate(existingStart.getDate() + 4);
            existingStart.setHours(14, 0, 0, 0);

            const existingEnd = new Date(existingStart);
            existingEnd.setHours(15, 0, 0, 0);

            await Booking.create({
                bookingid: 1,
                starttime: existingStart,
                endtime: existingEnd,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [],
                status: 'confirmed'
            });

            const queryStart = new Date(existingStart);
            queryStart.setHours(13, 30, 0, 0);

            const queryEnd = new Date(existingStart);
            queryEnd.setHours(14, 30, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${queryStart.toISOString()}&endtime=${queryEnd.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].roomid).toBe(testRoom2.roomid);
        });

        it('should handle bookings that span the entire query range', async () => {
            const existingStart = new Date();
            existingStart.setDate(existingStart.getDate() + 5);
            existingStart.setHours(13, 0, 0, 0);

            const existingEnd = new Date(existingStart);
            existingEnd.setHours(16, 0, 0, 0);

            await Booking.create({
                bookingid: 1,
                starttime: existingStart,
                endtime: existingEnd,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [],
                status: 'confirmed'
            });

            const queryStart = new Date(existingStart);
            queryStart.setHours(14, 0, 0, 0);

            const queryEnd = new Date(existingStart);
            queryEnd.setHours(15, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${queryStart.toISOString()}&endtime=${queryEnd.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].roomid).toBe(testRoom2.roomid);
        });

        // it('should handle multiple conflicting bookings correctly', async () => {
        //     const queryStart = new Date();
        //     queryStart.setDate(queryStart.getDate() + 6);
        //     queryStart.setHours(10, 0, 0, 0);

        //     const queryEnd = new Date(queryStart);
        //     queryEnd.setHours(11, 0, 0, 0);

        //     await Booking.create({
        //         bookingid: 1,
        //         starttime: queryStart,
        //         endtime: queryEnd,
        //         roomid: testRoom.roomid,
        //         createdBy: { userid: 1, name: "Admin User" },
        //         attendees: [],
        //         status: 'confirmed'
        //     });

        //     await Booking.create({
        //         bookingid: 2,
        //         starttime: queryStart,
        //         endtime: queryEnd,
        //         roomid: testRoom2.roomid,
        //         createdBy: { userid: 2, name: "Employee User" },
        //         attendees: [],
        //         status: 'confirmed'
        //     });

        //     const response = await request(app)
        //         .get(`/api/booking/v1/availablerooms?starttime=${queryStart.toISOString()}&endtime=${queryEnd.toISOString()}`)
        //         .set('Cookie', `token=${adminToken}`)
        //         .expect(200);

        //     expect(response.body.success).toBe(true);
        //     expect(response.body.data).toHaveLength(0);
        // });

        it('should exclude deleted rooms from available rooms', async () => {
            // Create a deleted room
            const deletedRoom = await Room.create({
                roomid: 3,
                roomname: 'Deleted Room',
                roomlocation: 'Floor 3, Building A',
                capacity: 8,
                equipment: ['Projector'],
                isDeleted: true
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${tomorrow.toISOString()}&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.some((room:any) => room.roomid === deletedRoom.roomid)).toBe(false);
            
            await Room.deleteOne({ roomid: 3 });
        });

        it('should fail with missing start time', async () => {
            const endtime = new Date();
            endtime.setDate(endtime.getDate() + 1);
            endtime.setHours(11, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.error).toBe('Start time and end time, both are required');
        });

        it('should fail with missing end time', async () => {
            const starttime = new Date();
            starttime.setDate(starttime.getDate() + 1);
            starttime.setHours(10, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${starttime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.error).toBe('Start time and end time, both are required');
        });

        it('should fail with both start time and end time missing', async () => {
            const response = await request(app)
                .get('/api/booking/v1/availablerooms')
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.error).toBe('Start time and end time, both are required');
        });

        it('should fail with invalid start time format', async () => {
            const endtime = new Date();
            endtime.setDate(endtime.getDate() + 1);
            endtime.setHours(11, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=invalid-date&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid date format');
            expect(response.body.error).toBe('Please provide valid date and time formats');
        });

        it('should fail with invalid end time format', async () => {
            const starttime = new Date();
            starttime.setDate(starttime.getDate() + 1);
            starttime.setHours(10, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${starttime.toISOString()}&endtime=invalid-date`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid date format');
            expect(response.body.error).toBe('Please provide valid date and time formats');
        });

        it('should fail with start time in the past', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(10, 0, 0, 0);

            const endtime = new Date(yesterday);
            endtime.setHours(11, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${yesterday.toISOString()}&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Something went wrong');
            expect(response.body.error).toBe('Start time cannot be in the past');
        });

        it('should fail with start time after end time', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(15, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(14, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${tomorrow.toISOString()}&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Something went wrong');
            expect(response.body.error).toBe('Start time must be before end time');
        });

        // it('should return custom message when no rooms are available', async () => {
        //     const queryStart = new Date();
        //     queryStart.setDate(queryStart.getDate() + 7);
        //     queryStart.setHours(10, 0, 0, 0);

        //     const queryEnd = new Date(queryStart);
        //     queryEnd.setHours(11, 0, 0, 0);

        //     // Book all available rooms
        //     await Booking.create({
        //         bookingid: 1,
        //         starttime: queryStart,
        //         endtime: queryEnd,
        //         roomid: testRoom.roomid,
        //         createdBy: { userid: 1, name: "Admin User" },
        //         attendees: [],
        //         status: 'confirmed'
        //     });

        //     await Booking.create({
        //         bookingid: 2,
        //         starttime: queryStart,
        //         endtime: queryEnd,
        //         roomid: testRoom2.roomid,
        //         createdBy: { userid: 2, name: "Employee User" },
        //         attendees: [],
        //         status: 'confirmed'
        //     });

        //     const response = await request(app)
        //         .get(`/api/booking/v1/availablerooms?starttime=${queryStart.toISOString()}&endtime=${queryEnd.toISOString()}`)
        //         .set('Cookie', `token=${adminToken}`)
        //         .expect(200);

        //     expect(response.body.success).toBe(true);
        //     expect(response.body.message).toBe('These are the available rooms');
        //     expect(response.body.data).toHaveLength(0);
        // });

        it('should fail without authentication', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${tomorrow.toISOString()}&endtime=${endtime.toISOString()}`)
                .expect(401);
        });

        it('should fail with temporary password', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(11, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${tomorrow.toISOString()}&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${tempPasswordToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('change password to access');
            expect(response.body.requiresPasswordChange).toBe(true);
        });

        it('should handle edge case with exact booking boundaries', async () => {
            const existingStart = new Date();
            existingStart.setDate(existingStart.getDate() + 8);
            existingStart.setHours(14, 0, 0, 0);

            const existingEnd = new Date(existingStart);
            existingEnd.setHours(15, 0, 0, 0);

            await Booking.create({
                bookingid: 1,
                starttime: existingStart,
                endtime: existingEnd,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [],
                status: 'confirmed'
            });

            // Query for 3-4 PM (starts exactly when existing booking ends)
            const queryStart = new Date(existingEnd);
            const queryEnd = new Date(queryStart);
            queryEnd.setHours(16, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${queryStart.toISOString()}&endtime=${queryEnd.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.some((room:any) => room.roomid === testRoom.roomid)).toBe(true);
        });

        it('should handle query that ends exactly when existing booking starts', async () => {
            const existingStart = new Date();
            existingStart.setDate(existingStart.getDate() + 9);
            existingStart.setHours(15, 0, 0, 0);

            const existingEnd = new Date(existingStart);
            existingEnd.setHours(16, 0, 0, 0);

            await Booking.create({
                bookingid: 1,
                starttime: existingStart,
                endtime: existingEnd,
                roomid: testRoom.roomid,
                createdBy: { userid: 1, name: "Admin User" },
                attendees: [],
                status: 'confirmed'
            });

            // Query for 2-3 PM (ends exactly when existing booking starts)
            const queryStart = new Date(existingStart);
            queryStart.setHours(14, 0, 0, 0);

            const queryEnd = new Date(existingStart);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${queryStart.toISOString()}&endtime=${queryEnd.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.some((room:any) => room.roomid === testRoom.roomid)).toBe(true);
        });

        it('should handle timezone considerations correctly for available rooms', async () => {
            const utcStart = new Date();
            utcStart.setUTCDate(utcStart.getUTCDate() + 1);
            utcStart.setUTCHours(14, 0, 0, 0);

            const utcEnd = new Date(utcStart);
            utcEnd.setUTCHours(15, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${utcStart.toISOString()}&endtime=${utcEnd.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        it('should return rooms in consistent format', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(16, 0, 0, 0);

            const endtime = new Date(tomorrow);
            endtime.setHours(17, 0, 0, 0);

            const response = await request(app)
                .get(`/api/booking/v1/availablerooms?starttime=${tomorrow.toISOString()}&endtime=${endtime.toISOString()}`)
                .set('Cookie', `token=${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);

            response.body.data.forEach((room: any) => {
                expect(room).toHaveProperty('roomid');
                expect(room).toHaveProperty('roomname');
                expect(room).toHaveProperty('roomlocation');
                expect(room).toHaveProperty('capacity');
                expect(room).toHaveProperty('equipment');
                expect(room).not.toHaveProperty('_id');
                expect(room).not.toHaveProperty('__v');
                expect(room).not.toHaveProperty('createdAt');
                expect(room).not.toHaveProperty('updatedAt');
                expect(room).not.toHaveProperty('isDeleted');
                expect(room).not.toHaveProperty('deletedAt');
                expect(typeof room.roomid).toBe('number');
                expect(typeof room.roomname).toBe('string');
                expect(typeof room.capacity).toBe('number');
                expect(Array.isArray(room.equipment)).toBe(true);
            });
        });
    });
});