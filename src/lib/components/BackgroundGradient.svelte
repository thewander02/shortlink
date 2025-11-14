<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let animationFrameId: number;
	let mouseX = 0;
	let mouseY = 0;

	onMount(() => {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		mouseX = window.innerWidth / 2;
		mouseY = window.innerHeight / 2;

		const handleMouseMove = (e: MouseEvent) => {
			mouseX = e.clientX;
			mouseY = e.clientY;
		};

		window.addEventListener('mousemove', handleMouseMove);

		const resizeCanvas = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};

		window.addEventListener('resize', resizeCanvas);
		resizeCanvas();

		const render = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const gradient = ctx.createRadialGradient(
				mouseX,
				mouseY,
				0,
				mouseX,
				mouseY,
				Math.max(window.innerWidth, window.innerHeight) * 0.5
			);

			gradient.addColorStop(0, 'rgba(100, 100, 255, 0.15)');
			gradient.addColorStop(0.5, 'rgba(50, 50, 200, 0.05)');
			gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			animationFrameId = window.requestAnimationFrame(render);
		};

		render();

		canvas.style.opacity = '0';
		canvas.style.transition = 'opacity 1.5s ease-in-out';
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				canvas.style.opacity = '1';
			});
		});

		return () => {
			window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('resize', resizeCanvas);
		};
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none fixed inset-0 z-0"></canvas>

<style>
	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}
</style>
