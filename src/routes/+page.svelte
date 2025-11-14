<script lang="ts">
	import { onMount } from 'svelte';
	import {
		LinkIcon,
		QrCode,
		History,
		Flag,
		Copy,
		Check,
		ArrowRight,
		ExternalLink
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import BackgroundGradient from '$lib/components/BackgroundGradient.svelte';
	import FloatingParticles from '$lib/components/FloatingParticles.svelte';
	import QRCodeGenerator from '$lib/components/QRCodeGenerator.svelte';
	import ReportUrlForm from '$lib/components/ReportUrlForm.svelte';
	import { toast } from 'svelte-sonner';
	import { browser } from '$app/environment';
	import { getUserIdFromStorage } from '$lib/utils/user-id';
	import { isValidUrl as validateUrl } from '$lib/utils/ip';

	let url = $state('');
	let shortUrl = $state('');
	let isLoading = $state(false);
	let copied = $state(false);
	let error = $state('');
	let showQR = $state(false);
	let showReportForm = $state(false);
	let inputRef: HTMLInputElement;
	let isMac = $state(false);
	let triggerParticleAnimation = $state(false);
	let hasUserId = $state(false);
	let isModifierPressed = $state(false);
	let isEnterPressed = $state(false);

	const isValidUrlInput = $derived(!url || validateUrl(url));

	onMount(() => {
		if (browser) {
			isMac = navigator.platform.toUpperCase().includes('MAC');
			hasUserId = !!getUserIdFromStorage();
		}
		inputRef?.focus();

		const handlePaste = (e: ClipboardEvent) => {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
				return;
			}

			const pastedText = e.clipboardData?.getData('text')?.trim();
			if (!pastedText || !validateUrl(pastedText)) return;

			url = pastedText;
			error = '';
			inputRef?.focus();
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			const isModifier = e.metaKey || e.ctrlKey;

			if (isModifier) {
				isModifierPressed = true;
			}

			if (isModifier && e.key === 'Enter') {
				isEnterPressed = true;
				e.preventDefault();
				document.getElementById('shorten-button')?.click();
			}

			if (isModifier && e.key === 'c' && shortUrl) {
				e.preventDefault();
				copyToClipboard();
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'Meta' || e.key === 'Control' || e.key === 'OSLeft' || e.key === 'OSRight') {
				isModifierPressed = false;
				isEnterPressed = false;
			}

			if (e.key === 'Enter') {
				isEnterPressed = false;
			}

			if (!e.metaKey && !e.ctrlKey) {
				isModifierPressed = false;
				isEnterPressed = false;
			}
		};

		document.addEventListener('paste', handlePaste);
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		window.addEventListener('blur', () => {
			isModifierPressed = false;
			isEnterPressed = false;
		});

		return () => {
			document.removeEventListener('paste', handlePaste);
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});

	function handleUrlChange(e: Event) {
		url = (e.target as HTMLInputElement).value;
		error = '';
	}

	async function handleSubmit() {
		error = '';
		showQR = false;

		if (!url) {
			error = 'Please enter a URL';
			return;
		}

		if (!isValidUrlInput) {
			error = 'Please enter a valid URL';
			return;
		}

		try {
			isLoading = true;
			const response = await fetch('/api/shorten', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to shorten URL');
			}

			shortUrl = data.shortUrl;
			triggerParticleAnimation = true;
			setTimeout(() => {
				triggerParticleAnimation = false;
			}, 100);
			toast.success('URL shortened successfully', {
				description: 'Your short link is ready to share'
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to shorten URL. Please try again.';
			toast.error('Failed to shorten URL', {
				description: error
			});
		} finally {
			isLoading = false;
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(shortUrl);
			copied = true;
			toast.success('Copied to clipboard', {
				description: 'Short URL is now in your clipboard'
			});
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			toast.error('Failed to copy', {
				description: 'Unable to copy to clipboard. Please try again'
			});
		}
	}

	function toggleQRCode() {
		showQR = !showQR;
	}
</script>

<div
	class="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black text-white"
>
	<BackgroundGradient />
	<FloatingParticles bind:triggerAnimation={triggerParticleAnimation} />

	<header class="relative z-10 container mx-auto py-6 sm:py-8">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md sm:h-10 sm:w-10"
				>
					<LinkIcon class="h-4 w-4 text-white sm:h-5 sm:w-5" />
				</div>
				<h1 class="text-xl font-light tracking-tight sm:text-2xl">shortlink</h1>
			</div>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (showReportForm = true)}
					class="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm text-amber-300 transition-colors hover:bg-amber-500/20"
					aria-label="Report a URL"
				>
					<Flag class="h-3.5 w-3.5" />
					<span class="hidden sm:inline">Report URL</span>
				</button>
				<a
					href="/history"
					class="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
				>
					<History class="h-4 w-4" />
					<span class="hidden sm:inline">History</span>
				</a>
			</div>
		</div>
	</header>

	<main
		class="relative z-10 container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-6 sm:py-0"
	>
		<div class="w-full max-w-md">
			<div class="mb-2">
				<h2 class="group cursor-default text-3xl font-light tracking-tight text-white sm:text-5xl">
					Shorten
					<span class="gradient-animate font-normal"> your link </span>
				</h2>
			</div>

			<p class="mb-6 text-sm text-gray-400 sm:mb-10 sm:text-base">
				Create short, memorable links in seconds.
			</p>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-4 sm:space-y-6"
			>
				<div class="relative">
					<input
						bind:this={inputRef}
						type="text"
						placeholder="example.com/very-long-url"
						bind:value={url}
						oninput={handleUrlChange}
						class="h-14 w-full rounded-2xl border sm:h-16 {!isValidUrlInput && url
							? 'border-red-500/50'
							: 'border-gray-800'} bg-gray-900/60 pr-5 pl-5 text-white backdrop-blur-md placeholder:text-gray-500 focus:border-gray-700 focus:ring-1 focus:ring-white/20 focus:outline-none"
						aria-label="URL to shorten"
					/>
					{#if error}
						<p class="mt-2 text-sm text-red-400" role="alert">{error}</p>
					{/if}
					<div class="mt-1 text-xs text-gray-500">
						<span class="flex items-center gap-1">
							<span>Tip: Just enter "example.com" (no https:// required)</span>
						</span>
					</div>
				</div>

				<Button
					id="shorten-button"
					type="submit"
					disabled={isLoading}
					class="relative h-14 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-white to-gray-200 font-medium text-black transition-all hover:shadow-lg hover:shadow-white/10 sm:h-16"
					aria-label="Shorten URL"
				>
					{#if isLoading}
						<div class="flex items-center justify-center">
							<svg class="h-8 w-8 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
									fill="none"
								/>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							<span class="sr-only">Loading...</span>
						</div>
					{:else}
						<span class="flex items-center justify-center gap-2 font-medium">
							Shorten URL <ArrowRight class="h-5 w-5" aria-hidden="true" />
						</span>
					{/if}
				</Button>

				<div class="text-center text-xs text-gray-500">
					Press <kbd
						class="rounded border px-1 py-0.5 text-xs transition-all duration-150 {isModifierPressed
							? 'border-gray-500 bg-gray-700 text-white'
							: 'border-gray-700 text-gray-400'}">{isMac ? 'Cmd' : 'Ctrl'}</kbd
					>
					+
					<kbd
						class="rounded border px-1 py-0.5 text-xs transition-all duration-150 {isEnterPressed
							? 'border-gray-500 bg-gray-700 text-white'
							: 'border-gray-700 text-gray-400'}">Enter</kbd
					> to submit
				</div>
			</form>

			{#if shortUrl}
				<div
					class="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-black/80 p-4 backdrop-blur-md sm:mt-10 sm:p-5"
					role="region"
					aria-label="Shortened URL result"
				>
					<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
						<div class="flex flex-col gap-1">
							<span class="text-xs text-gray-500">Your shortened URL</span>
							<p class="font-mono text-base break-all text-white sm:text-lg">{shortUrl}</p>
						</div>
						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								onclick={toggleQRCode}
								class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
								aria-label={showQR ? 'Hide QR code' : 'Show QR code'}
								aria-expanded={showQR}
							>
								<QrCode class="h-5 w-5" aria-hidden="true" />
							</button>
							<button
								type="button"
								onclick={copyToClipboard}
								class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
								aria-label="Copy to clipboard"
							>
								{#if copied}
									<Check class="h-5 w-5" aria-hidden="true" />
									<span class="sr-only">Copied!</span>
								{:else}
									<Copy class="h-5 w-5" aria-hidden="true" />
									<span class="sr-only">Copy</span>
								{/if}
							</button>
						</div>
					</div>

					{#if showQR}
						<div class="mt-4 overflow-hidden">
							<QRCodeGenerator url={shortUrl} />
						</div>
					{/if}

					<div class="mt-4 flex justify-center gap-4">
						<a
							href="/analytics/{shortUrl.split('/').pop()}"
							class="text-center text-xs text-gray-500 hover:text-gray-300"
						>
							View analytics
						</a>
						{#if hasUserId}
							<a href="/history" class="text-center text-xs text-gray-500 hover:text-gray-300">
								View history
							</a>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</main>

	<footer class="relative z-10 container mx-auto py-6 sm:py-8">
		<div class="flex flex-col items-center gap-4">
			<p class="text-center text-xs text-gray-500 sm:text-sm">Simple. Swift. Secure.</p>
			<div class="flex items-center gap-1 text-xs text-gray-500">
				<span>Created by</span>
				<a
					href="https://github.com/thewander02"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1 text-gray-400 transition-colors hover:text-white"
				>
					Vin
					<ExternalLink class="h-3 w-3" aria-hidden="true" />
				</a>
			</div>
		</div>
	</footer>
	<ReportUrlForm isOpen={showReportForm} onClose={() => (showReportForm = false)} />
</div>

<style>
	.gradient-animate {
		background: linear-gradient(to right, white, #9ca3af, white);
		background-size: 200% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-position: 0% 50%;
		transition: background-position 3s ease;
	}

	.group:hover .gradient-animate {
		background-position: 100% 50%;
	}
</style>
