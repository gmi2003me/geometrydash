class GeometryDashGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.musicGenerator = null;
        
        // Responsive canvas setup
        this.setupResponsiveCanvas();
        
        // Touch controls
        this.touchStartTime = 0;
        this.touchCooldown = 200; // Prevent rapid touch jumps
        
        // Game state
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = 5;
        this.gravity = 0.8;
        this.jumpForce = -15;
        
        // Player
        this.player = {
            x: 100,
            y: 0, // Will be set in setupResponsiveCanvas
            width: 40,
            height: 40,
            velocityY: 0,
            isGrounded: false,
            rotation: 0,
            color: '#00ff88'
        };
        
        // Obstacles and platforms
        this.obstacles = [];
        this.platforms = [];
        this.particles = [];
        
        // Camera
        this.cameraX = 0;
        
        // Input
        this.keys = {};
        this.autoMode = false;
        this.lastAutoJumpTime = 0;
        this.autoJumpCooldown = 800; // 800ms cooldown between auto jumps
        this.setupEventListeners();
        
        // Start screen
        this.showStartScreen();
        
        // Setup touch events
        this.setupTouchEvents();
    }
    
    setupResponsiveCanvas() {
        const resizeCanvas = () => {
            const container = document.getElementById('gameContainer');
            const containerRect = container.getBoundingClientRect();
            
            // Set canvas size to container size
            this.canvas.width = containerRect.width;
            this.canvas.height = containerRect.height;
            
            // Update game dimensions
            this.gameWidth = this.canvas.width;
            this.gameHeight = this.canvas.height;
            
            // Adjust player position if game is running
            if (this.gameState === 'playing') {
                this.player.x = 100;
                this.player.y = this.gameHeight - 100;
            }
        };
        
        // Initial resize
        resizeCanvas();
        
        // Resize on window resize
        window.addEventListener('resize', resizeCanvas);
        
        // Resize on orientation change (mobile)
        window.addEventListener('orientationchange', () => {
            setTimeout(resizeCanvas, 100);
        });
    }
    
    setupTouchEvents() {
        // Touch start
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const currentTime = Date.now();
            
            // Check cooldown
            if (currentTime - this.touchStartTime < this.touchCooldown) {
                return;
            }
            
            this.touchStartTime = currentTime;
            
            if (this.gameState === 'playing') {
                this.jump();
            }
        }, { passive: false });
        
        // Touch move (prevent scrolling)
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Touch end (prevent default behaviors)
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && this.gameState === 'playing') {
                this.jump();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Button events
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    showStartScreen() {
        document.getElementById('startScreen').style.display = 'block';
        document.getElementById('gameOverScreen').style.display = 'none';
        this.gameState = 'menu';
    }
    
    async startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').style.display = 'none';
        
        // Initialize audio context
        await this.initAudio();
        
        // Start music
        this.startMusic();
        
        // Start game loop
        this.gameLoop();
    }
    
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGenerator = new MusicGenerator(this.audioContext);
        } catch (error) {
            console.log('Audio not supported');
        }
    }
    
    startMusic() {
        if (this.musicGenerator) {
            this.musicGenerator.start();
        }
    }
    
    jump() {
        if (this.player.isGrounded) {
            this.player.velocityY = this.jumpForce;
            this.player.isGrounded = false;
            
            // Add jump particles
            this.addParticles(this.player.x + this.player.width/2, this.player.y + this.player.height, '#00ff88');
        }
    }
    
    // Check if player is on any solid surface
    checkIfGrounded() {
        // Check if on ground
        if (this.player.y + this.player.height >= this.gameHeight - 50) {
            return true;
        }
        
        // Check if on any block
        for (const obstacle of this.obstacles) {
            if (obstacle.type === 'block') {
                const obstacleScreenX = obstacle.x - this.cameraX;
                if (this.player.x < obstacleScreenX + obstacle.width &&
                    this.player.x + this.player.width > obstacleScreenX &&
                    Math.abs(this.player.y + this.player.height - obstacle.y) < 5) {
                    return true;
                }
            }
        }
        
        // Check if on any platform
        for (const platform of this.platforms) {
            const platformScreenX = platform.x - this.cameraX;
            if (this.player.x < platformScreenX + platform.width &&
                this.player.x + this.player.width > platformScreenX &&
                Math.abs(this.player.y + this.player.height - platform.y) < 5) {
                return true;
            }
        }
        
        return false;
    }
    
    addParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                decay: 0.02,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    updatePlayer() {
        // Apply gravity
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        
        // Ground collision
        if (this.player.y + this.player.height > this.gameHeight - 50) {
            this.player.y = this.gameHeight - 50 - this.player.height;
            this.player.velocityY = 0;
        }
        
        // Update grounded state based on all surfaces
        this.player.isGrounded = this.checkIfGrounded();
        
        // Rotation
        this.player.rotation += 0.2;
    }
    
    generateObstacles() {
        if (Math.random() < 0.03) { // Increased spawn rate
            const obstacleTypes = ['spike', 'block', 'platform'];
            const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            
            if (type === 'spike') {
                // Generate spikes at different positions
                const spikePositions = this.getSpikePositions();
                const position = spikePositions[Math.floor(Math.random() * spikePositions.length)];
                
                // Sometimes create spike patterns
                const spikePattern = Math.random();
                if (spikePattern < 0.7) {
                                    // Single spike
                this.obstacles.push({
                    x: this.gameWidth + this.cameraX,
                    y: position.y,
                    width: 40,
                    height: 40,
                    type: 'spike',
                    color: '#ff4444'
                });
            } else if (spikePattern < 0.85) {
                // Double spike
                this.obstacles.push({
                    x: this.gameWidth + this.cameraX,
                    y: position.y,
                    width: 40,
                    height: 40,
                    type: 'spike',
                    color: '#ff4444'
                });
                this.obstacles.push({
                    x: this.gameWidth + this.cameraX + 50,
                    y: position.y,
                    width: 40,
                    height: 40,
                    type: 'spike',
                    color: '#ff4444'
                });
            } else {
                // Triple spike
                this.obstacles.push({
                    x: this.gameWidth + this.cameraX,
                    y: position.y,
                    width: 40,
                    height: 40,
                    type: 'spike',
                    color: '#ff4444'
                });
                this.obstacles.push({
                    x: this.gameWidth + this.cameraX + 50,
                    y: position.y,
                    width: 40,
                    height: 40,
                    type: 'spike',
                    color: '#ff4444'
                });
                this.obstacles.push({
                    x: this.gameWidth + this.cameraX + 100,
                    y: position.y,
                    width: 40,
                    height: 40,
                    type: 'spike',
                    color: '#ff4444'
                });
            }
            } else if (type === 'block') {
                // Generate blocks at different heights for variety
                const heights = [120, 150, 180];
                const height = heights[Math.floor(Math.random() * heights.length)];
                this.obstacles.push({
                    x: this.gameWidth + this.cameraX,
                    y: this.gameHeight - height,
                    width: 40,
                    height: 60,
                    type: 'block',
                    color: '#ffaa00'
                });
            } else if (type === 'platform') {
                // Generate platforms at different heights and widths
                const heights = [150, 200, 250];
                const width = Math.random() < 0.5 ? 80 : 120;
                const height = heights[Math.floor(Math.random() * heights.length)];
                this.platforms.push({
                    x: this.gameWidth + this.cameraX,
                    y: this.gameHeight - height,
                    width: width,
                    height: 20,
                    color: '#00aaff'
                });
            }
        }
    }
    
    getSpikePositions() {
        const positions = [];
        
        // Ground level spike
        positions.push({
            y: this.gameHeight - 80
        });
        
        // Check for platforms to place spikes on
        for (const platform of this.platforms) {
            const platformScreenX = platform.x - this.cameraX;
            // Only consider platforms that are ahead of the player
            if (platformScreenX > this.player.x + 100) {
                positions.push({
                    y: platform.y - 40 // Place spike on top of platform
                });
            }
        }
        
        // Check for blocks to place spikes on
        for (const obstacle of this.obstacles) {
            if (obstacle.type === 'block') {
                const obstacleScreenX = obstacle.x - this.cameraX;
                // Only consider blocks that are ahead of the player
                if (obstacleScreenX > this.player.x + 100) {
                    positions.push({
                        y: obstacle.y - 40 // Place spike on top of block
                    });
                }
            }
        }
        
        // If no other positions available, use ground level
        if (positions.length === 0) {
            positions.push({
                y: this.canvas.height - 80
            });
        }
        
        return positions;
    }
    
    updateObstacles() {
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.gameSpeed;
            
            // Remove off-screen obstacles
            if (obstacle.x + obstacle.width < this.cameraX) {
                this.obstacles.splice(i, 1);
                this.score += 10;
            }
        }
        
        // Update platforms
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            platform.x -= this.gameSpeed;
            
            // Remove off-screen platforms
            if (platform.x + platform.width < this.cameraX) {
                this.platforms.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        // Check obstacle collisions
        for (const obstacle of this.obstacles) {
            if (obstacle.type === 'spike') {
                // Special collision detection for triangular spikes
                if (this.checkSpikeCollision(obstacle)) {
                    this.gameOver();
                    return;
                }
            } else {
                // Block collision - can land on top, but deadly from sides/bottom
                const obstacleScreenX = obstacle.x - this.cameraX;
                
                // Check if player is landing on top of the block
                if (this.player.x < obstacleScreenX + obstacle.width &&
                    this.player.x + this.player.width > obstacleScreenX &&
                    this.player.y + this.player.height >= obstacle.y &&
                    this.player.y + this.player.height <= obstacle.y + obstacle.height + 5 &&
                    this.player.velocityY >= 0) {
                    
                                    // Land on block
                this.player.y = obstacle.y - this.player.height;
                this.player.velocityY = 0;
                
                // Add landing particles
                this.addParticles(this.player.x + this.player.width/2, this.player.y + this.player.height, '#ffaa00');
                }
                // Check if player hits the block from sides or bottom (deadly)
                else if (this.player.x < obstacleScreenX + obstacle.width &&
                         this.player.x + this.player.width > obstacleScreenX &&
                         this.player.y < obstacle.y + obstacle.height &&
                         this.player.y + this.player.height > obstacle.y) {
                    this.gameOver();
                    return;
                }
            }
        }
        
        // Check platform collisions
        for (const platform of this.platforms) {
            // Check if player is above the platform and falling (accounting for camera offset)
            const platformScreenX = platform.x - this.cameraX;
            if (this.player.x < platformScreenX + platform.width &&
                this.player.x + this.player.width > platformScreenX &&
                this.player.y + this.player.height >= platform.y &&
                this.player.y + this.player.height <= platform.y + platform.height + 5 &&
                this.player.velocityY >= 0) {
                
                // Land on platform
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                
                // Add landing particles
                this.addParticles(this.player.x + this.player.width/2, this.player.y + this.player.height, '#00aaff');
            }
        }
    }
    
    checkSpikeCollision(spike) {
        // Get spike triangle points (accounting for camera offset)
        const spikeX = spike.x - this.cameraX;
        const spikeY = spike.y;
        const spikeWidth = spike.width;
        const spikeHeight = spike.height;
        
        // Triangle points: bottom-left, top, bottom-right
        const trianglePoints = [
            { x: spikeX, y: spikeY + spikeHeight },
            { x: spikeX + spikeWidth / 2, y: spikeY },
            { x: spikeX + spikeWidth, y: spikeY + spikeHeight }
        ];
        
        // Check if any corner of the player cube intersects with the triangle
        const playerCorners = [
            { x: this.player.x, y: this.player.y },
            { x: this.player.x + this.player.width, y: this.player.y },
            { x: this.player.x, y: this.player.y + this.player.height },
            { x: this.player.x + this.player.width, y: this.player.y + this.player.height }
        ];
        
        for (const corner of playerCorners) {
            if (this.pointInTriangle(corner, trianglePoints)) {
                return true;
            }
        }
        
        // Also check if any triangle point is inside the player rectangle
        for (const point of trianglePoints) {
            if (point.x >= this.player.x && point.x <= this.player.x + this.player.width &&
                point.y >= this.player.y && point.y <= this.player.y + this.player.height) {
                return true;
            }
        }
        
        // Check if any edge of the triangle intersects with the player rectangle
        const triangleEdges = [
            [trianglePoints[0], trianglePoints[1]],
            [trianglePoints[1], trianglePoints[2]],
            [trianglePoints[2], trianglePoints[0]]
        ];
        
        const playerEdges = [
            [{ x: this.player.x, y: this.player.y }, { x: this.player.x + this.player.width, y: this.player.y }],
            [{ x: this.player.x + this.player.width, y: this.player.y }, { x: this.player.x + this.player.width, y: this.player.y + this.player.height }],
            [{ x: this.player.x + this.player.width, y: this.player.y + this.player.height }, { x: this.player.x, y: this.player.y + this.player.height }],
            [{ x: this.player.x, y: this.player.y + this.player.height }, { x: this.player.x, y: this.player.y }]
        ];
        
        for (const triangleEdge of triangleEdges) {
            for (const playerEdge of playerEdges) {
                if (this.linesIntersect(triangleEdge[0], triangleEdge[1], playerEdge[0], playerEdge[1])) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    linesIntersect(p1, p2, p3, p4) {
        const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (denominator === 0) return false;
        
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }
    
    pointInTriangle(point, triangle) {
        const [p1, p2, p3] = triangle;
        
        // Calculate barycentric coordinates
        const denominator = ((p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y));
        const a = ((p2.y - p3.y) * (point.x - p3.x) + (p3.x - p2.x) * (point.y - p3.y)) / denominator;
        const b = ((p3.y - p1.y) * (point.x - p3.x) + (p1.x - p3.x) * (point.y - p3.y)) / denominator;
        const c = 1 - a - b;
        
        return a >= 0 && b >= 0 && c >= 0;
    }
    
    autoJump() {
        if (!this.player.isGrounded) {
            console.log('Auto mode: Not grounded, skipping jump');
            return;
        }
        
        // Check cooldown to prevent excessive jumping
        const currentTime = Date.now();
        if (currentTime - this.lastAutoJumpTime < this.autoJumpCooldown) {
            console.log('Auto mode: Cooldown active, skipping jump');
            return;
        }
        
        // Only look at obstacles that are very close (immediate danger)
        const immediateDangerDistance = 40;
        
        console.log('Auto mode: Checking for obstacles...');
        console.log('Player position:', this.player.x, this.player.y);
        console.log('Camera X:', this.cameraX);
        
        // Check for spikes that will kill us - only if they're very close
        for (const obstacle of this.obstacles) {
            const obstacleScreenX = obstacle.x - this.cameraX;
            const distance = obstacleScreenX - this.player.x;
            
            console.log(`Obstacle ${obstacle.type}: screenX=${obstacleScreenX}, distance=${distance}`);
            
            if (obstacle.type === 'spike' && distance > 0 && distance < immediateDangerDistance) {
                // Only jump if spike is very close and we're about to hit it
                console.log('Auto mode: Jumping over spike at distance', distance);
                this.jump();
                this.lastAutoJumpTime = currentTime;
                return;
            }
        }
        
        // Check for blocks that we can't walk over (only if we're on ground level)
        if (this.player.y >= this.gameHeight - 100) {
            for (const obstacle of this.obstacles) {
                const obstacleScreenX = obstacle.x - this.cameraX;
                const distance = obstacleScreenX - this.player.x;
                
                if (obstacle.type === 'block' && distance > 0 && distance < immediateDangerDistance) {
                    // Check if this block is too high to walk over
                    const blockTop = obstacle.y;
                    const playerBottom = this.player.y + this.player.height;
                    
                    console.log(`Block check: blockTop=${blockTop}, playerBottom=${playerBottom}, difference=${playerBottom - blockTop}`);
                    
                    // Only jump if the block is significantly higher than the player (more conservative)
                    if (blockTop < playerBottom - 40) { // Increased from 20 to 40
                        console.log('Auto mode: Jumping over block at distance', distance);
                        this.jump();
                        this.lastAutoJumpTime = currentTime;
                        return;
                    }
                }
            }
        }
        
        // Check for gaps only if we're on ground level and about to fall
        if (this.player.y >= this.gameHeight - 100) {
            // Look for a gap right in front of us (much shorter distance)
            const gapCheckDistance = 30;
            let hasGroundDirectlyAhead = false;
            
            // Check if there's ground directly in front of the player
            for (const obstacle of this.obstacles) {
                const obstacleScreenX = obstacle.x - this.cameraX;
                const distance = obstacleScreenX - this.player.x;
                if (distance > 0 && distance < gapCheckDistance) {
                    hasGroundDirectlyAhead = true;
                    console.log('Found ground ahead at distance', distance);
                    break;
                }
            }
            
            // Only jump if there's definitely no ground directly ahead
            if (!hasGroundDirectlyAhead) {
                console.log('Auto mode: Jumping over gap - no ground found');
                this.jump();
                this.lastAutoJumpTime = currentTime;
                return;
            }
        }
        
        console.log('Auto mode: No jump needed');
    }
    
    updateCamera() {
        this.cameraX += this.gameSpeed;
        this.distance = Math.floor(this.cameraX / 10);
        
        // Increase game speed over time
        this.gameSpeed += 0.001;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalDistance').textContent = this.distance;
        document.getElementById('gameOverScreen').style.display = 'block';
        
        if (this.musicGenerator) {
            this.musicGenerator.stop();
        }
    }
    
    restartGame() {
        // Reset game state
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = 5;
        this.cameraX = 0;
        
        // Reset player
        this.player.x = 100;
        this.player.y = this.gameHeight - 100;
        this.player.velocityY = 0;
        this.player.isGrounded = false;
        this.player.rotation = 0;
        
        // Clear obstacles and particles
        this.obstacles = [];
        this.platforms = [];
        this.particles = [];
        
        // Start new game
        this.startGame();
    }
    
    drawPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
        this.ctx.rotate(this.player.rotation);
        
        // Add glow effect when grounded
        if (this.player.isGrounded) {
            this.ctx.shadowColor = this.player.color;
            this.ctx.shadowBlur = 15;
        }
        
        // Add auto mode visual effect
        if (this.autoMode) {
            this.ctx.shadowColor = '#ffaa00';
            this.ctx.shadowBlur = 20;
            // Add pulsing effect
            const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 1;
            this.ctx.scale(pulse, pulse);
        }
        
        // Draw cube with gradient
        const gradient = this.ctx.createLinearGradient(-this.player.width/2, -this.player.height/2, this.player.width/2, this.player.height/2);
        gradient.addColorStop(0, this.player.color);
        gradient.addColorStop(1, '#00cc6a');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(-this.player.width/2, -this.player.height/2, this.player.width, this.player.height);
        
        // Draw cube outline
        this.ctx.strokeStyle = this.autoMode ? '#ffaa00' : '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-this.player.width/2, -this.player.height/2, this.player.width, this.player.height);
        
        this.ctx.restore();
    }
    
    drawObstacles() {
        // Draw obstacles
        for (const obstacle of this.obstacles) {
            this.ctx.fillStyle = obstacle.color;
            if (obstacle.type === 'spike') {
                // Draw spike as a proper triangle
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.x - this.cameraX, obstacle.y + obstacle.height);
                this.ctx.lineTo(obstacle.x - this.cameraX + obstacle.width/2, obstacle.y);
                this.ctx.lineTo(obstacle.x - this.cameraX + obstacle.width, obstacle.y + obstacle.height);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Add spike outline
                this.ctx.strokeStyle = '#cc0000';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Add auto mode detection indicator
                if (this.autoMode && this.gameState === 'playing') {
                    const obstacleScreenX = obstacle.x - this.cameraX;
                    const distance = obstacleScreenX - this.player.x;
                    if (distance > 0 && distance < 40) {
                        this.ctx.strokeStyle = '#ffff00';
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    }
                }
            } else {
                // Draw block with outline
                this.ctx.fillRect(obstacle.x - this.cameraX, obstacle.y, obstacle.width, obstacle.height);
                this.ctx.strokeStyle = '#cc6600';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(obstacle.x - this.cameraX, obstacle.y, obstacle.width, obstacle.height);
                
                // Add auto mode detection indicator
                if (this.autoMode && this.gameState === 'playing') {
                    const obstacleScreenX = obstacle.x - this.cameraX;
                    const distance = obstacleScreenX - this.player.x;
                    if (distance > 0 && distance < 40) {
                        this.ctx.strokeStyle = '#ffff00';
                        this.ctx.lineWidth = 3;
                        this.ctx.strokeRect(obstacle.x - this.cameraX, obstacle.y, obstacle.width, obstacle.height);
                    }
                }
            }
        }
        
        // Draw platforms
        for (const platform of this.platforms) {
            this.ctx.fillStyle = platform.color;
            this.ctx.fillRect(platform.x - this.cameraX, platform.y, platform.width, platform.height);
            
            // Add platform outline
            this.ctx.strokeStyle = '#0066cc';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(platform.x - this.cameraX, platform.y, platform.width, platform.height);
        }
        
        // Draw auto mode detection zone
        if (this.autoMode && this.gameState === 'playing') {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(this.player.x, 0, 40, this.canvas.height);
            this.ctx.setLineDash([]);
        }
    }
    
    drawParticles() {
        for (const particle of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x - this.cameraX, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    
    drawBackground() {
        // Draw ground
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, this.gameHeight - 50, this.gameWidth, 50);
        
        // Draw grid lines
        this.ctx.strokeStyle = '#444444';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.gameWidth; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.gameHeight);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.gameHeight; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.gameWidth, y);
            this.ctx.stroke();
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('distance').textContent = this.distance;
        
        // Show auto mode indicator
        const uiElement = document.getElementById('ui');
        if (this.autoMode && this.gameState === 'playing') {
            if (!uiElement.querySelector('#autoModeIndicator')) {
                const autoIndicator = document.createElement('div');
                autoIndicator.id = 'autoModeIndicator';
                autoIndicator.textContent = 'AUTO MODE';
                autoIndicator.style.color = '#ffaa00';
                autoIndicator.style.fontSize = '18px';
                autoIndicator.style.marginTop = '10px';
                autoIndicator.style.textShadow = '0 0 10px #ffaa00';
                uiElement.appendChild(autoIndicator);
            }
            
            // Add debug info for auto mode
            const debugInfo = uiElement.querySelector('#autoDebugInfo') || document.createElement('div');
            debugInfo.id = 'autoDebugInfo';
            debugInfo.style.color = '#ffaa00';
            debugInfo.style.fontSize = '14px';
            debugInfo.style.marginTop = '5px';
            
            // Count obstacles in detection range
            let obstaclesInRange = 0;
            for (const obstacle of this.obstacles) {
                const obstacleScreenX = obstacle.x - this.cameraX;
                const distance = obstacleScreenX - this.player.x;
                if (distance > 0 && distance < 40) {
                    obstaclesInRange++;
                }
            }
            
            debugInfo.textContent = `Grounded: ${this.player.isGrounded}, Y: ${Math.round(this.player.y)}, Obstacles in range: ${obstaclesInRange}`;
            
            if (!uiElement.querySelector('#autoDebugInfo')) {
                uiElement.appendChild(debugInfo);
            }
        } else {
            const existingIndicator = uiElement.querySelector('#autoModeIndicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            const existingDebug = uiElement.querySelector('#autoDebugInfo');
            if (existingDebug) {
                existingDebug.remove();
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw game objects
        this.drawObstacles();
        this.drawParticles();
        this.drawPlayer();
        
        // Update UI
        this.updateUI();
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Check for auto mode
        this.autoMode = this.keys['KeyA'] || false;
        
        this.updatePlayer();
        this.generateObstacles();
        this.updateObstacles();
        this.updateParticles();
        this.checkCollisions();
        this.updateCamera();
        
        // Auto mode logic
        if (this.autoMode) {
            console.log('=== Auto mode frame start ===');
            this.autoJump();
            console.log('=== Auto mode frame end ===');
        }
    }
    
    gameLoop() {
        this.update();
        this.render();
        
        if (this.gameState === 'playing') {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

class MusicGenerator {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isPlaying = false;
        this.startTime = 0;
        this.bpm = 140;
        this.beatInterval = 60 / this.bpm;
        this.nextBeatTime = 0;
        
        // Musical scale (C major pentatonic)
        this.scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        this.currentNote = 0;
        this.melodyPattern = [0, 2, 4, 2, 1, 3, 5, 4];
        this.melodyIndex = 0;
    }
    
    start() {
        this.isPlaying = true;
        this.startTime = this.audioContext.currentTime;
        this.nextBeatTime = this.startTime;
        this.scheduleNextBeat();
    }
    
    stop() {
        this.isPlaying = false;
    }
    
    scheduleNextBeat() {
        if (!this.isPlaying) return;
        
        const now = this.audioContext.currentTime;
        
        while (this.nextBeatTime < now + 0.1) {
            this.playBeat(this.nextBeatTime);
            this.nextBeatTime += this.beatInterval;
        }
        
        setTimeout(() => this.scheduleNextBeat(), 50);
    }
    
    playBeat(time) {
        // Play kick drum
        this.playKick(time);
        
        // Play melody every 4 beats
        if (Math.floor((time - this.startTime) / this.beatInterval) % 4 === 0) {
            this.playMelodyNote(time);
        }
        
        // Play bass every 2 beats
        if (Math.floor((time - this.startTime) / this.beatInterval) % 2 === 0) {
            this.playBass(time);
        }
        
        // Play hi-hat
        this.playHiHat(time);
    }
    
    playKick(time) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(150, time);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        gainNode.gain.setValueAtTime(1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        oscillator.start(time);
        oscillator.stop(time + 0.5);
    }
    
    playHiHat(time) {
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() - 0.5) * 2;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        noise.buffer = buffer;
        noise.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        noise.start(time);
        noise.stop(time + 0.1);
    }
    
    playBass(time) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const bassNote = this.scale[Math.floor(Math.random() * 3)] / 2; // Lower octave
        oscillator.frequency.setValueAtTime(bassNote, time);
        
        gainNode.gain.setValueAtTime(0.4, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        oscillator.start(time);
        oscillator.stop(time + 0.5);
    }
    
    playMelodyNote(time) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const noteIndex = this.melodyPattern[this.melodyIndex % this.melodyPattern.length];
        const frequency = this.scale[noteIndex];
        
        oscillator.frequency.setValueAtTime(frequency, time);
        
        gainNode.gain.setValueAtTime(0.2, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        
        oscillator.start(time);
        oscillator.stop(time + 0.3);
        
        this.melodyIndex++;
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new GeometryDashGame();
}); 