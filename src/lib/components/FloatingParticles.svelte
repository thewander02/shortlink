<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Particle {
		x: number;
		y: number;
		size: number;
		speedX: number;
		speedY: number;
		opacity: number;
		targetX?: number;
		targetY?: number;
		originalX?: number;
		originalY?: number;
		originalSpeedX?: number;
		originalSpeedY?: number;
		originalOpacity?: number;
		phase?: 'normal' | 'converging' | 'bursting' | 'returning';
		angle?: number;
		radius?: number;
	}

	let { triggerAnimation = $bindable(false) } = $props();

	let canvas: HTMLCanvasElement;
	let animationFrameId: number | undefined;
	let particles: Particle[] = [];
	const particleCount = 30;
	let animationPhase: 'normal' | 'converging' | 'bursting' | 'returning' = 'normal';
	let animationProgress = 0;
	let centerX = 0;
	let centerY = 0;
	let ctx: CanvasRenderingContext2D | null = null;
	let startConvergenceAnimation: (() => void) | null = null;

	$effect(() => {
		if (triggerAnimation && animationPhase === 'normal' && startConvergenceAnimation) {
			startConvergenceAnimation();
		}
	});

	onMount(() => {
		if (!browser || !canvas) return;

		ctx = canvas.getContext('2d');
		if (!ctx) return;

		const initParticles = () => {
			particles = [];
			for (let i = 0; i < particleCount; i++) {
				particles.push({
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					size: Math.random() * 2 + 0.5,
					speedX: (Math.random() - 0.5) * 0.3,
					speedY: (Math.random() - 0.5) * 0.3,
					opacity: Math.random() * 0.5 + 0.1,
					phase: 'normal'
				});
			}
		};

		startConvergenceAnimation = () => {
			if (!canvas) return;

			centerX = canvas.width / 2;
			centerY = canvas.height / 2;
			animationPhase = 'converging';
			animationProgress = 0;

			particles.forEach((particle) => {
				particle.originalX = particle.x;
				particle.originalY = particle.y;
				particle.originalSpeedX = particle.speedX;
				particle.originalSpeedY = particle.speedY;
				particle.originalOpacity = particle.opacity;
				particle.targetX = centerX;
				particle.targetY = centerY;
				particle.phase = 'converging';
			});
		};

		const resizeCanvas = () => {
			if (!canvas) return;
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			initParticles();
		};

		window.addEventListener('resize', resizeCanvas);
		resizeCanvas();

		const render = () => {
			if (!canvas || !ctx) return;

			const context = ctx;
			context.clearRect(0, 0, canvas.width, canvas.height);

			if (animationPhase !== 'normal') {
				animationProgress += 0.016;
			}

			particles.forEach((particle, index) => {
				if (particle.phase === 'converging') {
					const easeProgress = 1 - Math.pow(1 - Math.min(animationProgress / 1.2, 1), 3);
					particle.x =
						particle.originalX! + (particle.targetX! - particle.originalX!) * easeProgress;
					particle.y =
						particle.originalY! + (particle.targetY! - particle.originalY!) * easeProgress;
					particle.opacity = Math.min(particle.originalOpacity! + easeProgress * 0.5, 1);
					particle.size = Math.random() * 2 + 0.5 + easeProgress * 2;

					if (easeProgress >= 0.99) {
						particle.phase = 'bursting';
						particle.angle = (index / particleCount) * Math.PI * 2;
						particle.radius = 0;
					}
				} else if (particle.phase === 'bursting') {
					particle.radius = (animationProgress - 1.2) * 150;
					const spiralAngle = particle.angle! + (animationProgress - 1.2) * 3;
					particle.x = centerX + Math.cos(spiralAngle) * particle.radius;
					particle.y = centerY + Math.sin(spiralAngle) * particle.radius;
					const burstProgress = (animationProgress - 1.2) / 0.8;
					particle.opacity = Math.max(0, particle.originalOpacity! * (1 - burstProgress));
					particle.size = (Math.random() * 2 + 0.5) * (1 - burstProgress * 0.5);

					if (animationProgress >= 2.0) {
						particle.phase = 'returning';
					}
				} else if (particle.phase === 'returning') {
					const returnProgress = (animationProgress - 2.0) / 1.0;
					if (returnProgress <= 1) {
						const easeReturn = 1 - Math.pow(1 - returnProgress, 2);
						particle.x = centerX + (particle.originalX! - centerX) * easeReturn;
						particle.y = centerY + (particle.originalY! - centerY) * easeReturn;
						particle.opacity = particle.originalOpacity! * easeReturn;
						particle.size = Math.random() * 2 + 0.5;
					} else {
						particle.phase = 'normal';
						particle.x = particle.originalX!;
						particle.y = particle.originalY!;
						particle.speedX = particle.originalSpeedX!;
						particle.speedY = particle.originalSpeedY!;
						particle.opacity = particle.originalOpacity!;
						particle.size = Math.random() * 2 + 0.5;
					}
				} else {
					particle.x += particle.speedX;
					particle.y += particle.speedY;

					if (particle.x < 0) particle.x = canvas.width;
					if (particle.x > canvas.width) particle.x = 0;
					if (particle.y < 0) particle.y = canvas.height;
					if (particle.y > canvas.height) particle.y = 0;
				}

				context.beginPath();
				context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

				if (particle.phase === 'converging' || particle.phase === 'bursting') {
					const gradient = context.createRadialGradient(
						particle.x,
						particle.y,
						0,
						particle.x,
						particle.y,
						particle.size * 3
					);
					gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
					gradient.addColorStop(0.5, `rgba(200, 200, 255, ${particle.opacity * 0.6})`);
					gradient.addColorStop(1, `rgba(150, 150, 255, 0)`);
					context.fillStyle = gradient;
				} else {
					context.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
				}
				context.fill();
			});

			if (animationProgress >= 3.0) {
				animationPhase = 'normal';
				animationProgress = 0;
				triggerAnimation = false;
			}

			animationFrameId = window.requestAnimationFrame(render);
		};

		render();

		canvas.style.opacity = '0';
		canvas.style.transition = 'opacity 2s ease-in-out';
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				setTimeout(() => {
					canvas.style.opacity = '0.7';
				}, 500);
			});
		});

		return () => {
			if (animationFrameId) {
				window.cancelAnimationFrame(animationFrameId);
			}
			window.removeEventListener('resize', resizeCanvas);
		};
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none fixed inset-0" style="z-index: 1;"></canvas>
