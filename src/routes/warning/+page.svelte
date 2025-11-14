<script lang="ts">
	import { AlertTriangle, ArrowLeft, ExternalLink } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showAppealForm = $state(false);
	let appealReason = $state('');
	let contactInfo = $state('');
	let isSubmitting = $state(false);

	const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
	const shortUrl = `${baseUrl}/${data.shortCode}`;

	const safetyWarnings = data.analytics?.safetyWarnings || [];

	async function submitAppeal() {
		if (!appealReason.trim()) {
			toast.error('Reason required', {
				description: 'Please provide a reason for your appeal'
			});
			return;
		}

		isSubmitting = true;
		try {
			const response = await fetch('/api/appeals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shortCode: data.shortCode,
					reason: appealReason,
					contactInfo: contactInfo || undefined
				})
			});

			if (!response.ok) {
				throw new Error('Failed to submit appeal');
			}

			toast.success('Appeal submitted', {
				description: 'We will review your appeal and get back to you'
			});
			showAppealForm = false;
			appealReason = '';
			contactInfo = '';
		} catch (error) {
			toast.error('Failed to submit appeal', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div
	class="flex min-h-screen flex-col bg-gradient-to-br from-black via-gray-900 to-black text-white"
>
	<div class="absolute inset-0 z-0 overflow-hidden">
		<div class="absolute top-1/4 -left-1/4 h-96 w-96 rounded-full bg-red-500/5 blur-3xl"></div>
		<div class="absolute top-3/4 -right-1/4 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl"></div>
	</div>

	<main
		class="relative z-10 container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-12"
	>
		<div class="w-full max-w-md">
			<a
				href="/"
				class="mb-8 flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
			>
				<ArrowLeft class="h-4 w-4" aria-hidden="true" />
				Back to home
			</a>

			<div class="mb-6 flex items-center justify-center">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
					<AlertTriangle class="h-8 w-8 text-red-400" />
				</div>
			</div>

			<h1 class="mb-2 text-center text-3xl font-light tracking-tight text-white">
				Warning: Potentially Unsafe Link
			</h1>
			<p class="mb-6 text-center text-gray-400">
				The link you're trying to visit has been reported as potentially malicious or unsafe.
			</p>

			<div
				class="mb-8 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-900/20 to-black/80 p-6 backdrop-blur-md"
			>
				<h2 class="mb-4 text-lg font-medium text-white">Link Details</h2>

				<div class="mb-4">
					<p class="text-sm text-gray-400">Short URL</p>
					<p class="font-mono text-sm break-all text-white">{shortUrl}</p>
				</div>

				<div class="mb-6">
					<p class="text-sm text-gray-400">Destination</p>
					<p class="font-mono text-sm break-all text-red-300">{data.originalUrl}</p>
				</div>

				{#if safetyWarnings.length > 0}
					<div class="mt-4">
						<h3 class="mb-2 text-sm font-medium text-white">Safety Concerns:</h3>
						<ul class="list-disc space-y-1 pl-5 text-sm text-red-300">
							{#each safetyWarnings as warning}
								<li>{warning}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if data.analytics?.safetyCategory}
					<div class="mt-2">
						<p class="text-sm text-gray-400">
							Category: <span class="text-red-300">{data.analytics.safetyCategory}</span>
						</p>
					</div>
				{/if}

				<div class="mt-4 rounded-xl bg-red-900/20 p-4">
					<p class="text-sm text-red-300">
						This link may lead to phishing, malware, or other harmful content. We recommend not
						proceeding.
					</p>
				</div>

				{#if showAppealForm}
					<div class="mt-6 space-y-4">
						<div>
							<label for="appeal-reason" class="mb-2 block text-sm font-medium text-white">
								Reason for Appeal
							</label>
							<Textarea
								id="appeal-reason"
								bind:value={appealReason}
								placeholder="Please explain why you believe this link should not be flagged..."
								class="min-h-[100px] border-gray-700 bg-gray-900/50 text-white"
							/>
						</div>
						<div>
							<label for="contact-info" class="mb-2 block text-sm font-medium text-white">
								Contact Information (Optional)
							</label>
							<input
								id="contact-info"
								type="text"
								bind:value={contactInfo}
								placeholder="Email or other contact info"
								class="w-full rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2 text-white placeholder:text-gray-500"
							/>
						</div>
						<div class="flex gap-2">
							<Button
								onclick={submitAppeal}
								disabled={isSubmitting}
								class="flex-1 bg-white text-black hover:bg-gray-200"
							>
								{isSubmitting ? 'Submitting...' : 'Submit Appeal'}
							</Button>
							<Button
								onclick={() => {
									showAppealForm = false;
									appealReason = '';
									contactInfo = '';
								}}
								variant="ghost"
								class="text-white hover:bg-white/10"
							>
								Cancel
							</Button>
						</div>
					</div>
				{:else}
					<div class="mt-4 flex justify-end">
						<Button
							onclick={() => (showAppealForm = true)}
							class="bg-white/10 text-white hover:bg-white/20"
						>
							Submit Appeal
						</Button>
					</div>
				{/if}
			</div>

			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<a
					href="/"
					class="rounded-xl bg-white/10 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/20"
				>
					Return to safety
				</a>

				<a
					href={data.originalUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-center gap-2 rounded-xl bg-red-500/20 px-6 py-3 text-center text-sm font-medium text-red-300 transition-colors hover:bg-red-500/30"
				>
					Proceed anyway
					<ExternalLink class="h-4 w-4" />
				</a>
			</div>
		</div>
	</main>

	<footer class="relative z-10 container mx-auto py-6">
		<div class="flex flex-col items-center gap-2">
			<p class="text-center text-xs text-gray-500">
				If you believe this link has been flagged incorrectly, please use the appeal button above.
			</p>
		</div>
	</footer>
</div>
