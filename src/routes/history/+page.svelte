<script lang="ts">
	import {
		ArrowLeft,
		ExternalLink,
		Clock,
		MousePointer,
		Copy,
		Check,
		Trash2,
		QrCode,
		Download
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import UserIdManager from '$lib/components/UserIdManager.svelte';
	import SpaceBackground from '$lib/components/SpaceBackground.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import QRCode from 'qrcode';

	let { data }: { data: PageData } = $props();

	let copiedIndex = $state<number | null>(null);
	let hoveredIndex = $state<number | null>(null);
	let qrDialogOpen = $state(false);
	let selectedUrl = $state<string | null>(null);
	let qrCanvas: HTMLCanvasElement | null = $state(null);
	let qrDataUrl = $state<string>('');

	function getTimeAgo(dateString: string): string {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

			if (seconds < 60) return `${seconds} seconds ago`;

			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;

			const hours = Math.floor(minutes / 60);
			if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

			const days = Math.floor(hours / 24);
			if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

			const months = Math.floor(days / 30);
			if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;

			const years = Math.floor(months / 12);
			return `${years} ${years === 1 ? 'year' : 'years'} ago`;
		} catch (e) {
			return 'some time ago';
		}
	}

	function formatUrl(url: string, maxLength = 40): string {
		if (!url) return '';

		if (url.length <= maxLength) return url;

		try {
			const urlObj = new URL(url);
			const domain = urlObj.hostname;
			const path = urlObj.pathname;

			if (domain.length + 10 >= maxLength) {
				return domain + '/...';
			}

			const availableChars = maxLength - domain.length - 6;
			const truncatedPath =
				path.length > availableChars ? path.substring(0, availableChars) + '...' : path;

			return domain + truncatedPath;
		} catch (e) {
			return url.substring(0, maxLength - 3) + '...';
		}
	}

	async function copyToClipboard(text: string, index: number) {
		try {
			await navigator.clipboard.writeText(text);
			copiedIndex = index;
			toast.success('Copied to clipboard', {
				description: 'Short URL is now in your clipboard'
			});
			setTimeout(() => (copiedIndex = null), 2000);
		} catch (err) {
			toast.error('Failed to copy', {
				description: 'Unable to copy to clipboard. Please try again'
			});
		}
	}

	function isInteractiveElement(target: HTMLElement): boolean {
		return (
			target.closest('button') !== null ||
			target.closest('a') !== null ||
			target.tagName === 'BUTTON' ||
			target.tagName === 'A'
		);
	}

	function handleCardClick(event: MouseEvent, item: (typeof data.urlHistory)[0], index: number) {
		if (isInteractiveElement(event.target as HTMLElement)) return;
		event.stopPropagation();
		copyToClipboard(item.shortUrl, index);
	}

	function handleCardKeyDown(
		event: KeyboardEvent,
		item: (typeof data.urlHistory)[0],
		index: number
	) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (isInteractiveElement(event.target as HTMLElement)) return;

		event.preventDefault();
		event.stopPropagation();
		copyToClipboard(item.shortUrl, index);
	}

	$effect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if ((event.ctrlKey || event.metaKey) && event.key === 'c' && hoveredIndex !== null) {
				const item = data.urlHistory[hoveredIndex];
				if (item) {
					event.preventDefault();
					copyToClipboard(item.shortUrl, hoveredIndex);
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	async function deleteUrl(shortCode: string) {
		if (!confirm('Are you sure you want to delete this URL?')) {
			return;
		}

		try {
			const response = await fetch(`/api/links/${shortCode}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete URL');
			}

			toast.success('URL deleted', {
				description: 'The short URL has been removed'
			});
			window.location.reload();
		} catch (error) {
			toast.error('Failed to delete URL', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
		}
	}

	function openQrDialog(url: string) {
		selectedUrl = url;
		qrDataUrl = '';
		qrDialogOpen = true;
	}

	$effect(() => {
		if (!qrDialogOpen) {
			selectedUrl = null;
			qrDataUrl = '';
		}
	});

	$effect(() => {
		if (qrDialogOpen && selectedUrl && qrCanvas) {
			const generateQR = async () => {
				if (!selectedUrl || !qrCanvas) return;

				try {
					await QRCode.toCanvas(qrCanvas, selectedUrl, {
						width: 300,
						margin: 1,
						color: {
							dark: '#FFFFFF',
							light: '#00000000'
						}
					});

					const dataUrl = await QRCode.toDataURL(selectedUrl, {
						width: 600,
						margin: 1,
						color: {
							dark: '#FFFFFF',
							light: '#00000000'
						}
					});
					qrDataUrl = dataUrl;
				} catch (err) {
					console.error('Error generating QR code:', err);
					toast.error('Failed to generate QR code', {
						description: 'Please try again'
					});
				}
			};
			generateQR();
		}
	});

	function downloadQRCode() {
		if (!qrDataUrl || !selectedUrl) return;

		let filename = 'qrcode';
		try {
			const urlObj = new URL(selectedUrl);
			const hostname = urlObj.hostname.replace(/\./g, '-');
			const path = urlObj.pathname.replace(/\//g, '-').substring(0, 20);
			filename = `qrcode-${hostname}${path}`;
		} catch {
			toast.error('Failed to download QR code', {
				description: 'Please try again'
			});
		}

		const link = document.createElement('a');
		link.href = qrDataUrl;
		link.download = `${filename}.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		toast.success('QR code downloaded', {
			description: 'The QR code has been saved to your device'
		});
	}
</script>

<div class="relative min-h-screen overflow-hidden bg-[#05060F] text-white">
	<SpaceBackground />

	<main class="relative z-10 flex min-h-screen flex-col">
		<div class="container mx-auto flex-1 px-4 py-8 sm:px-6 sm:py-12">
			<div class="mx-auto max-w-5xl space-y-6">
				<div class="flex items-center justify-between">
					<a
						href="/"
						class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
					>
						<ArrowLeft class="h-4 w-4" aria-hidden="true" />
						Back to Home
					</a>
				</div>

				<section class="flex flex-col gap-4">
					<div class="rounded-2xl border border-white/10 bg-white/4 p-1 backdrop-blur-lg">
						<UserIdManager />
					</div>

					{#if data.error}
						<div
							class="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-6 text-center text-sm text-rose-100 backdrop-blur-xl"
							role="alert"
						>
							<p>{data.error}</p>
							<a
								href="/"
								class="mt-4 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
							>
								Return to Home
							</a>
						</div>
					{:else if data.urlHistory.length === 0}
						<div
							class="rounded-2xl border border-white/10 bg-white/4 p-8 text-center backdrop-blur-xl"
						>
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-white/15 bg-white/10"
							>
								<Clock class="h-9 w-9 text-slate-200" />
							</div>
							<h2 class="mb-3 text-2xl font-semibold text-white">No history yet</h2>
							<p class="mx-auto mb-6 max-w-2xl text-sm text-slate-200/85">
								Start your first mission by shortening a link, or set a user ID above to sync your
								activity across devices.
							</p>
							<a
								href="/"
								class="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-sky-400 via-indigo-400 to-purple-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_14px_36px_-24px_rgba(125,211,252,0.6)] transition-transform hover:scale-[1.01]"
							>
								Shorten a URL
							</a>
						</div>
					{:else}
						<div class="space-y-3">
							{#each data.urlHistory as item, index (item.shortCode)}
								<div
									role="button"
									tabindex="0"
									class="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-lg transition-all duration-200 hover:border-sky-200/40 hover:bg-white/8 focus:ring-2 focus:ring-sky-300/40 focus:outline-none"
									onclick={(e) => handleCardClick(e, item, index)}
									onkeydown={(e) => handleCardKeyDown(e, item, index)}
									onmouseenter={() => (hoveredIndex = index)}
									onmouseleave={() => (hoveredIndex = null)}
									aria-label="Click to copy short URL"
								>
									<div class="mb-4 flex items-start justify-between gap-4">
										<div class="min-w-0 flex-1 space-y-3">
											<div>
												<h3 class="mb-1 truncate text-base font-medium text-white">
													{formatUrl(item.originalUrl, 60)}
												</h3>
												<a
													href={item.originalUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-sky-300"
												>
													<ExternalLink class="h-3 w-3" />
													Open original
												</a>
											</div>

											<div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
												<span class="inline-flex items-center gap-1.5">
													<Clock class="h-3 w-3" />
													{getTimeAgo(item.createdAt)}
												</span>
												<span class="inline-flex items-center gap-1.5">
													<MousePointer class="h-3 w-3" />
													{item.clicks}
													{item.clicks === 1 ? 'click' : 'clicks'}
												</span>
											</div>
										</div>

										<a
											href="/analytics/{item.shortCode}"
											class="shrink-0 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15"
										>
											Analytics
										</a>
									</div>

									<div class="flex items-center gap-2 border-t border-white/10 pt-4">
										<p class="min-w-0 flex-1 truncate font-mono text-sm text-slate-300">
											{item.shortUrl}
										</p>
										<div class="flex items-center gap-1.5">
											<button
												type="button"
												onclick={() => openQrDialog(item.shortUrl)}
												class="rounded-lg border border-white/10 bg-white/10 p-2 text-white transition-colors hover:bg-white/15"
												aria-label="Show QR code"
											>
												<QrCode class="h-4 w-4" />
											</button>
											<button
												type="button"
												onclick={() => copyToClipboard(item.shortUrl, index)}
												class="rounded-lg border border-white/10 bg-white/10 p-2 text-white transition-colors hover:bg-white/15"
												aria-label="Copy to clipboard"
											>
												{#if copiedIndex === index}
													<Check class="h-4 w-4" />
												{:else}
													<Copy class="h-4 w-4" />
												{/if}
											</button>
											<button
												type="button"
												onclick={() => deleteUrl(item.shortCode)}
												class="rounded-lg border border-rose-300/30 bg-rose-500/15 p-2 text-rose-200 transition-colors hover:bg-rose-500/25"
												aria-label="Delete URL"
											>
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			</div>
		</div>
	</main>

	<!-- QR Code Dialog -->
	<Dialog.Root bind:open={qrDialogOpen}>
		<Dialog.Content
			class="max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#070b1a]/95 shadow-[0_22px_60px_-40px_rgba(30,64,175,0.45)] backdrop-blur-xl"
			showCloseButton={true}
		>
			<Dialog.Header class="border-b border-white/5">
				<Dialog.Title class="text-lg font-semibold text-white">QR Code</Dialog.Title>
				<Dialog.Description class="text-sm text-slate-300/75">
					Scan this QR code to open the shortened URL
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col items-center gap-4 px-6 py-6">
				<div
					class="relative rounded-2xl bg-linear-to-br from-gray-800 to-black p-4 shadow-lg sm:p-6"
				>
					<canvas bind:this={qrCanvas} class="rounded-lg"></canvas>
				</div>

				{#if selectedUrl}
					<p class="max-w-xs truncate text-center font-mono text-xs text-slate-400">
						{selectedUrl}
					</p>
				{/if}

				<button
					type="button"
					onclick={downloadQRCode}
					disabled={!qrDataUrl}
					class="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Download class="h-4 w-4" />
					Download QR Code
				</button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>
