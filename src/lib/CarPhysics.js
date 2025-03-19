import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export default class CarPhysics {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        this.car = {};
        this.chassis = {};
        this.wheels = [];
        this.chassisDimension = {
            x: 1.96,
            y: 1,
            z: 4.3
        };
        this.chassisModelPos = {
            x: 0,
            y: -0.629999999999999,
            z: 0
        };
        this.wheelScale = {
            frontWheel: 1.1,
            hindWheel: 1.1
        };
        this.mass = 250;
        
        // For tire marks
        this.tireMarks = [];
        this.lastMarkTime = 0;
    }

    init(chassisModel) {
        this.chassis = chassisModel;
        this.setChassis();
        this.setWheels();
        this.setupControls();
        this.update();
        
        return this;
    }

    setChassis() {
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            this.chassisDimension.x * 0.5, 
            this.chassisDimension.y * 0.5, 
            this.chassisDimension.z * 0.5
        ));
        const chassisBody = new CANNON.Body({
            mass: this.mass, 
            material: new CANNON.Material({friction: 0})
        });
        chassisBody.addShape(chassisShape);
        chassisBody.position.set(0, 0.5, -5); // Starting position

        this.car = new CANNON.RaycastVehicle({
            chassisBody,
            indexRightAxis: 0,
            indexUpAxis: 1,
            indexForwardAxis: 2
        });
        
        this.car.addToWorld(this.world);
    }

    setWheels() {
        this.car.wheelInfos = [];
        
        // Front left wheel
        this.car.addWheel({
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 45,
            suspensionRestLength: 0.4,
            frictionSlip: 30,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 10000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(0.75, 0.1, -1.32),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: 30,
        });
        
        // Front right wheel
        this.car.addWheel({
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 45,
            suspensionRestLength: 0.4,
            frictionSlip: 30,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 10000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(-0.78, 0.1, -1.32),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: 30,
        });
        
        // Rear left wheel
        this.car.addWheel({
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 45,
            suspensionRestLength: 0.4,
            frictionSlip: 30,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 10000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(0.75, 0.1, 1.25),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: 30,
        });
        
        // Rear right wheel
        this.car.addWheel({
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 45,
            suspensionRestLength: 0.4,
            frictionSlip: 30,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 10000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(-0.78, 0.1, 1.25),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: 30,
        });

        // Create wheel bodies
        this.car.wheelInfos.forEach((wheel, index) => {
            const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
            const wheelBody = new CANNON.Body({
                mass: 1,
                material: new CANNON.Material({friction: 0}),
            });
            const quaternion = new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0);
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
        });
    }

    setupControls() {
        const maxSteerVal = 0.5;
        const maxForce = 750;
        const brakeForce = 36;
        const slowDownCar = 19.6;
        this.keysPressed = [];

        window.addEventListener('keydown', (e) => {
            if(!this.keysPressed.includes(e.key.toLowerCase())) {
                this.keysPressed.push(e.key.toLowerCase());
            }
            this.handleMovement();
        });
        
        window.addEventListener('keyup', (e) => {
            const index = this.keysPressed.indexOf(e.key.toLowerCase());
            if (index !== -1) {
                this.keysPressed.splice(index, 1);
            }
            this.handleMovement();
        });
    }

    handleMovement() {
        if(this.keysPressed.includes("r")) {
            this.resetCar();
        }

        if(!this.keysPressed.includes(" ")){
            // Release brakes
            this.car.setBrake(0, 0);
            this.car.setBrake(0, 1);
            this.car.setBrake(0, 2);
            this.car.setBrake(0, 3);

            // Steering
            if(this.keysPressed.includes("a") || this.keysPressed.includes("arrowleft")) {
                this.car.setSteeringValue(0.5, 0);
                this.car.setSteeringValue(0.5, 1);
            }
            else if(this.keysPressed.includes("d") || this.keysPressed.includes("arrowright")) {
                this.car.setSteeringValue(-0.5, 0);
                this.car.setSteeringValue(-0.5, 1);
            }
            else {
                this.car.setSteeringValue(0, 0);
                this.car.setSteeringValue(0, 1);
            }

            // Acceleration/Braking
            if(this.keysPressed.includes("w") || this.keysPressed.includes("arrowup")) {
                this.car.applyEngineForce(-maxForce, 2);
                this.car.applyEngineForce(-maxForce, 3);
            }
            else if(this.keysPressed.includes("s") || this.keysPressed.includes("arrowdown")) {
                this.car.applyEngineForce(maxForce, 2);
                this.car.applyEngineForce(maxForce, 3);
            }
            else {
                this.car.applyEngineForce(0, 2);
                this.car.applyEngineForce(0, 3);
                this.car.setBrake(slowDownCar, 0);
                this.car.setBrake(slowDownCar, 1);
                this.car.setBrake(slowDownCar, 2);
                this.car.setBrake(slowDownCar, 3);
            }
        }
        else {
            // Handbrake
            this.car.setBrake(brakeForce, 0);
            this.car.setBrake(brakeForce, 1);
            this.car.setBrake(brakeForce, 2);
            this.car.setBrake(brakeForce, 3);
        }
    }

    resetCar() {
        this.car.chassisBody.position.set(0, 4, 0);
        this.car.chassisBody.quaternion.set(0, 0, 0, 1);
        this.car.chassisBody.angularVelocity.set(0, 0, 0);
        this.car.chassisBody.velocity.set(0, 0, 0);
    }

    update() {
        this.world.addEventListener('postStep', () => {
            if (this.chassis) {
                // Update chassis position and rotation
                this.chassis.position.copy(this.car.chassisBody.position);
                this.chassis.quaternion.copy(this.car.chassisBody.quaternion);
                
                // Get speed data for camera effects
                const velocity = this.car.chassisBody.velocity;
                const speed = velocity.length();
                const maxSpeed = 20;
                
                // Store data for camera effects
                this.chassis.userData = {
                    speedRatio: Math.min(speed / maxSpeed, 1),
                    isDrifting: this.isDrifting(),
                    tireSlip: this.getTireSlip()
                };
                
                // Create tire marks if drifting or braking hard
                if (this.shouldCreateTireMarks()) {
                    this.createTireMarks();
                }
            }
        });
    }
    
    isDrifting() {
        if (!this.car.chassisBody) return false;
        
        // Check if we're moving fast enough and turning hard or using handbrake
        const velocity = this.car.chassisBody.velocity;
        const speed = velocity.length();
        
        return (speed > 5 && 
               (Math.abs(this.car.wheelInfos[0].steering) > 0.3 || 
                this.keysPressed.includes(" ")));
    }
    
    getTireSlip() {
        if (!this.car.chassisBody) return 0;
        
        // Calculate tire slip based on lateral velocity
        const velocity = this.car.chassisBody.velocity;
        const forward = new CANNON.Vec3(0, 0, 1);
        forward.applyQuaternion(this.car.chassisBody.quaternion);
        
        const right = new CANNON.Vec3(1, 0, 0);
        right.applyQuaternion(this.car.chassisBody.quaternion);
        
        const forwardVelocity = forward.dot(velocity);
        const rightVelocity = right.dot(velocity);
        
        // Return lateral velocity as slip
        return rightVelocity;
    }
    
    shouldCreateTireMarks() {
        return this.isDrifting() || 
              (this.keysPressed.includes("s") && this.car.chassisBody.velocity.length() > 5);
    }
    
    createTireMarks() {
        // Implementation for tire marks would go here
        // This would be similar to your existing tire marks code
    }
    
    getChassisBody() {
        return this.car.chassisBody;
    }
} 