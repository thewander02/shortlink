<script lang="ts">
	import { AlertTriangle, X, Check, Flag } from '@lucide/svelte';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let open = $state(isOpen);

	$effect(() => {
		open = isOpen;
	});

	$effect(() => {
		if (!open) {
			onClose();
		}
	});

	const REPORT_CATEGORIES = [
		{ id: 'phishing', label: 'Phishing' },
		{ id: 'malware', label: 'Malware or Virus' },
		{ id: 'scam', label: 'Scam or Fraud' },
		{ id: 'inappropriate', label: 'Inappropriate Content' },
		{ id: 'copyright', label: 'Copyright Violation' },
		{ id: 'other', label: 'Other' }
	];

	let url = $state('');
	let email = $state('');
	let category = $state('other');
	let description = $state('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	function resetForm() {
		url = '';
		email = '';
		category = 'other';
		description = '';
		error = null;
		success = false;
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	function extractShortCode(urlInput: string): string | null {
		const trimmed = urlInput.trim();
		if (!trimmed) return null;

		try {
			const urlObj = new URL(trimmed);
			const pathname = urlObj.pathname.replace(/^\//, '');
			if (pathname && !pathname.includes('/')) {
				return pathname;
			}
		} catch {
			// Not a full URL, continue to check if it's just the code
		}

		const potentialCode = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
		if (potentialCode.length >= 4 && potentialCode.length <= 12) {
			return potentialCode;
		}

		return null;
	}

	async function handleSubmit() {
		error = null;
		success = false;

		if (!url.trim()) {
			error = 'Please enter a URL to report';
			return;
		}

		const shortCode = extractShortCode(url);
		if (!shortCode) {
			error = 'Invalid URL format. Please enter a valid shortened URL';
			return;
		}

		try {
			isSubmitting = true;
			const response = await fetch('/api/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shortCode,
					reason: `Reported via home page form - ${category}`,
					email: email || undefined,
					category: category || undefined,
					description: description || undefined
				})
			});

			if (!response.ok) {
				throw new Error('Failed to submit report');
			}

			success = true;
			toast.success('Report submitted', {
				description: "We'll review this URL and take appropriate action"
			});
			url = '';
			email = '';
			category = 'other';
			description = '';
		} catch (err) {
			error = 'An error occurred while reporting the URL. Please try again.';
			toast.error('Failed to submit report', {
				description: err instanceof Error ? err.message : 'Please try again'
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Dialog bind:open>
	<DialogContent
		class="max-h-[90vh] max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#070b1a]/90 shadow-[0_22px_60px_-40px_rgba(30,64,175,0.45)] backdrop-blur-xl sm:max-h-[85vh] sm:max-w-lg"
		showCloseButton={false}
	>
		<div class="flex max-h-[calc(90vh-2rem)] flex-col overflow-hidden sm:max-h-[calc(85vh-2rem)]">
			<DialogHeader class="border-b border-white/5">
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white"
						>
							<Flag class="h-5 w-5 text-sky-200" />
						</div>
						<div>
							<DialogTitle class="text-lg font-semibold text-white">Report a URL</DialogTitle>
							<p class="mt-1 text-xs text-slate-300/75">
								Flag anything suspicious so we can keep the network safe.
							</p>
						</div>
					</div>

					<button
						onclick={handleClose}
						class="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-sky-300/40 focus:outline-none"
					>
						<X class="h-5 w-5" />
						<span class="sr-only">Close</span>
					</button>
				</div>
			</DialogHeader>

			<div class="flex-1 overflow-y-auto px-5 pt-5 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
				{#if success}
					<div
						class="rounded-lg border border-emerald-300/25 bg-emerald-400/10 p-5 text-center backdrop-blur-lg"
					>
						<div
							class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-200/40 bg-white/10"
						>
							<Check class="h-6 w-6 text-emerald-200" />
						</div>
						<h3 class="mb-2 text-base font-medium text-white">Report received</h3>
						<p class="mx-auto mb-6 max-w-xs text-sm text-slate-200/80">
							Thanks for looking out. We’ll review the link shortly and take action if needed.
						</p>
						<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Button
								onclick={resetForm}
								class="h-10 rounded-lg border border-white/10 bg-white/10 px-5 text-sm font-medium text-white transition-colors hover:bg-white/15"
							>
								Report another URL
							</Button>
							<Button
								onclick={handleClose}
								class="h-10 rounded-lg border border-white/10 bg-white px-5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
							>
								Close
							</Button>
						</div>
					</div>
				{:else}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
						class="space-y-4"
					>
						<div class="space-y-1.5">
							<label
								for="url"
								class="block text-[11px] font-medium tracking-[0.16em] text-slate-300/70 uppercase"
							>
								Shortened URL <span class="text-rose-300">*</span>
							</label>
							<Input
								id="url"
								type="text"
								bind:value={url}
								placeholder="l.tw02.us/stellar-code"
								class="h-10 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 focus:border-sky-300/70 focus:ring-2 focus:ring-sky-300/30"
								disabled={isSubmitting}
								required
							/>
							<p class="text-[11px] text-slate-300/65">
								Include the full short link or just the code at the end.
							</p>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<label
									for="category"
									class="block text-[11px] font-medium tracking-[0.16em] text-slate-300/70 uppercase"
								>
									Issue category
								</label>
								<select
									id="category"
									bind:value={category}
									class="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white transition-colors outline-none focus:border-sky-300/70 focus:ring-2 focus:ring-sky-300/30"
									disabled={isSubmitting}
								>
									{#each REPORT_CATEGORIES as cat}
										<option class="bg-slate-900 text-white" value={cat.id}>{cat.label}</option>
									{/each}
								</select>
							</div>

							<div class="space-y-1.5">
								<label
									for="email"
									class="block text-[11px] font-medium tracking-[0.16em] text-slate-300/70 uppercase"
								>
									Email <span class="text-slate-500">(optional)</span>
								</label>
								<Input
									id="email"
									type="email"
									bind:value={email}
									placeholder="you@orbitmail.com"
									class="h-10 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 focus:border-sky-300/70 focus:ring-2 focus:ring-sky-300/30"
									disabled={isSubmitting}
								/>
								<p class="text-[11px] text-slate-300/65">
									We’ll only follow up if we need more context from you.
								</p>
							</div>
						</div>

						<div class="space-y-1.5">
							<label
								for="description"
								class="block text-[11px] font-medium tracking-[0.16em] text-slate-300/70 uppercase"
							>
								Description
							</label>
							<Textarea
								id="description"
								bind:value={description}
								placeholder="Tell us what raised a flag. Any details are helpful."
								class="h-28 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-slate-400 focus:border-sky-300/70 focus:ring-2 focus:ring-sky-300/30"
								disabled={isSubmitting}
							/>
						</div>

						{#if error}
							<div
								class="rounded-lg border border-rose-300/25 bg-rose-500/10 p-4 text-sm text-rose-100"
							>
								<div class="flex items-start gap-3">
									<div
										class="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-rose-200/40 bg-white/10"
									>
										<AlertTriangle class="h-4 w-4 text-rose-200" />
									</div>
									<p>{error}</p>
								</div>
							</div>
						{/if}

						<div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
							<Button
								type="button"
								onclick={handleClose}
								class="h-10 rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								class="h-10 rounded-lg border-none bg-white px-6 text-sm text-black hover:bg-white/90 hover:text-black"
								disabled={isSubmitting}
							>
								{#if isSubmitting}
									<div class="flex items-center gap-2">
										<Spinner class="h-4 w-4" />
										<span>Submitting…</span>
									</div>
								{:else}
									Submit report
								{/if}
							</Button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</DialogContent>
</Dialog>
