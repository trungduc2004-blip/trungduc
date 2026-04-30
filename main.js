const canvas = document.getElementById('gameCanvas');
const c = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// UI Elements
const scoreElement = document.getElementById('liveScore');
const startGameBtn = document.getElementById('startGameBtn');
const uiComponent = document.getElementById('uiComponent');
const finalScoreText = document.getElementById('finalScoreText');
const scoreContainer = document.getElementById('scoreContainer');

let score = 0;

// Lớp Người Chơi
class Player {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
    }

    draw() {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = this.color;
        
        // Hiệu ứng phát sáng neon
        c.shadowColor = this.color;
        c.shadowBlur = 20;
        
        c.fill();
        c.closePath();
        
        // Reset shadow để không ảnh hưởng các vật thể khác ko cần shadow
        c.shadowBlur = 0;
    }
}

// Lớp Đạn
class Projectile {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
    }

    draw() {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = this.color;
        c.fill();
        c.closePath();
    }

    update() {
        this.draw();
        this.x = this.x + this.velocity.x;
        this.y = this.y + this.velocity.y;
    }
}

// Lớp Kẻ Địch
class Enemy {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
    }

    draw() {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = this.color;
        
        // Glowing effect for enemies
        c.shadowColor = this.color;
        c.shadowBlur = 15;
        
        c.fill();
        c.closePath();
        
        c.shadowBlur = 0;
    }

    update() {
        this.draw();
        this.x = this.x + this.velocity.x;
        this.y = this.y + this.velocity.y;
    }
}

// Hiệu ứng Particle (hạt khi nổ)
const friction = 0.98;
class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        c.save();
        c.globalAlpha = this.alpha;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = this.color;
        c.fill();
        c.closePath();
        c.restore();
    }

    update() {
        this.draw();
        this.velocity.x *= friction;
        this.velocity.y *= friction;
        this.x = this.x + this.velocity.x;
        this.y = this.y + this.velocity.y;
        this.alpha -= 0.01;
    }
}

// Khởi tạo trạng thái game
let player;
let projectiles = [];
let enemies = [];
let particles = [];
let animationId;
let spawnInterval;

function init() {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    player = new Player(x, y, 15, 'white');
    projectiles = [];
    enemies = [];
    particles = [];
    score = 0;
    scoreElement.innerHTML = score;
    finalScoreText.innerHTML = score;
}

function spawnEnemies() {
    // Mỗi 1 giây xuất hiện 1 kẻ địch tùy chỉnh độ khó ở đây
    spawnInterval = setInterval(() => {
        const radius = Math.random() * (30 - 10) + 10;
        
        let x;
        let y;

        // Xác định vị trí xuất hiện ngoài viền màn hình ngẫu nhiên
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
        }

        // Tạo màu ngẫu nhiên nhưng theo tông Neon rực rỡ dùng HSL
        const hue = Math.random() * 360;
        const color = `hsl(${hue}, 100%, 50%)`;

        // Tính toán góc di chuyển từ vị trí enemy hướng về vị trí player ở giữa
        const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
        const velocity = {
            x: Math.cos(angle) * 1.2,
            y: Math.sin(angle) * 1.2
        };

        enemies.push(new Enemy(x, y, radius, color, velocity));
    }, 1000);
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Hiệu ứng mờ dần (trail effect) cho các background frame
    c.fillStyle = 'rgba(10, 10, 12, 0.2)'; 
    c.fillRect(0, 0, canvas.width, canvas.height);
    
    player.draw();

    // Render particles
    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        } else {
            particle.update();
        }
    });

    // Render đạn
    projectiles.forEach((projectile, index) => {
        projectile.update();

        // Xoá đạn nếu bay ra khỏi màn hình
        if (projectile.x + projectile.radius < 0 ||
            projectile.x - projectile.radius > canvas.width ||
            projectile.y + projectile.radius < 0 ||
            projectile.y - projectile.radius > canvas.height) {
            setTimeout(() => {
                projectiles.splice(index, 1);
            }, 0);
        }
    });

    // Render kẻ địch
    enemies.forEach((enemy, index) => {
        enemy.update();

        // Xử lý va chạm giữa player và enemy -> GAME OVER
        const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        
        if (distToPlayer - enemy.radius - player.radius < 1) {
            cancelAnimationFrame(animationId);
            clearInterval(spawnInterval); // Dừng sinh quái
            
            // Hiển thị màn hình End Game
            uiComponent.classList.remove('hidden');
            scoreContainer.classList.remove('hidden');
            finalScoreText.innerHTML = score;
            document.getElementById('gameTitle').innerHTML = "GAME OVER";
        }

        // Xử lý va chạm giữa đạn và kẻ địch
        projectiles.forEach((projectile, projectileIndex) => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            // Khi chạm (khoảng cách < tổng bán kính)
            if (dist - enemy.radius - projectile.radius < 1) {
                // Tạo explosion
                for (let i = 0; i < enemy.radius * 2; i++) {
                    particles.push(new Particle(
                        projectile.x, 
                        projectile.y, 
                        Math.random() * 3, 
                        enemy.color, 
                        {
                            x: (Math.random() - 0.5) * (Math.random() * 6),
                            y: (Math.random() - 0.5) * (Math.random() * 6)
                        }
                    ));
                }

                if (enemy.radius - 10 > 10) {
                    // Thu gọn kẻ thù (gsap nhự nhàng)
                    score += 100;
                    scoreElement.innerHTML = score;
                    
                    if(typeof gsap !== 'undefined') {
                        gsap.to(enemy, {
                            radius: enemy.radius - 10
                        });
                    } else {
                        enemy.radius -= 10;
                    }
                    
                    setTimeout(() => {
                        projectiles.splice(projectileIndex, 1);
                    }, 0);
                } else {
                    // Xóa hoàn toàn kẻ thù
                    score += 250;
                    scoreElement.innerHTML = score;
                    
                    setTimeout(() => {
                        enemies.splice(index, 1);
                        projectiles.splice(projectileIndex, 1);
                    }, 0);
                }
            }
        });
    });
}

// Bắn đạn khi nhấp chuột
window.addEventListener('click', (event) => {
    if(!uiComponent.classList.contains('hidden')) return; // Không bắn khi ở màn hình menu

    const angle = Math.atan2(
        event.clientY - canvas.height / 2,
        event.clientX - canvas.width / 2
    );
    
    // Vận tốc đạn
    const velocity = {
        x: Math.cos(angle) * 7,
        y: Math.sin(angle) * 7
    };

    projectiles.push(new Projectile(
        canvas.width / 2, 
        canvas.height / 2, 
        5, 
        'white', 
        velocity
    ));
});

// Bắt đầu game
startGameBtn.addEventListener('click', () => {
    init();
    animate();
    spawnEnemies();
    uiComponent.classList.add('hidden');
});

// Xử lý khi resize cửa sổ
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if(player) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
});
