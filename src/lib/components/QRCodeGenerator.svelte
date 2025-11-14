<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import QRCode from 'qrcode';
	import { Download } from '@lucide/svelte';

	interface Props {
		url: string;
		size?: number;
	}

	let { url, size = 200 }: Props = $props();

	let canvas: HTMLCanvasElement;
	let qrDataUrl = '';
	let actualSize = size;

	onMount(() => {
		const handleResize = () => {
			const isMobile = window.innerWidth < 500;
			actualSize = isMobile ? 180 : size;
		};

		handleResize();
		window.addEventListener('resize', handleResize);

		const generateQR = async () => {
			if (!url || !canvas) return;

			try {
				await QRCode.toCanvas(canvas, url, {
					width: actualSize,
					margin: 1,
					color: {
						dark: '#FFFFFF',
						light: '#00000000'
					}
				});

				const dataUrl = await QRCode.toDataURL(url, {
					width: actualSize * 2,
					margin: 1,
					color: {
						dark: '#FFFFFF',
						light: '#00000000'
					}
				});
				qrDataUrl = dataUrl;
			} catch (err) {
				console.error('Error generating QR code:', err);
			}
		};

		generateQR();

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	$effect(() => {
		if (url && canvas) {
			const generateQR = async () => {
				try {
					await QRCode.toCanvas(canvas, url, {
						width: actualSize,
						margin: 1,
						color: {
							dark: '#FFFFFF',
							light: '#00000000'
						}
					});

					const dataUrl = await QRCode.toDataURL(url, {
						width: actualSize * 2,
						margin: 1,
						color: {
							dark: '#FFFFFF',
							light: '#00000000'
						}
					});
					qrDataUrl = dataUrl;
				} catch (err) {
					console.error('Error generating QR code:', err);
				}
			};
			generateQR();
		}
	});

	function downloadQRCode() {
		if (!qrDataUrl) return;

		let filename = 'qrcode';
		try {
			const urlObj = new URL(url);
			filename = `qrcode-${urlObj.hostname.replace(/\./g, '-')}`;
		} catch {
			// Use default filename if URL parsing fails
		}

		const link = document.createElement('a');
		link.href = qrDataUrl;
		link.download = `${filename}.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<div class="flex flex-col items-center gap-4">
	<div class="relative rounded-2xl bg-gradient-to-br from-gray-800 to-black p-4 shadow-lg sm:p-6">
		<canvas bind:this={canvas} class="rounded-lg"></canvas>
	</div>
	<button
		onclick={downloadQRCode}
		class="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
	>
		<Download class="h-4 w-4" />
		Download QR Code
	</button>
</div>
