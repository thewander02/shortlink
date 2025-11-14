<script lang="ts">
	import { Shield, AlertTriangle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import BackgroundGradient from '$lib/components/BackgroundGradient.svelte';
	import FloatingParticles from '$lib/components/FloatingParticles.svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showAppealForm = $state(false);
	let appealReason = $state('');
	let contactInfo = $state('');
	let isSubmitting = $state(false);

	const expiryDate = data.blockInfo.expiresAt
		? new Date(data.blockInfo.expiresAt).toLocaleString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				timeZoneName: 'short'
			})
		: 'Never';

	async function submitAppeal() {
		if (!appealReason.trim()) {
			toast.error('Reason required', {
				description: 'Please provide a reason for your appeal'
			});
			return;
		}

		isSubmitting = true;
		try {
			const response = await fetch('/api/appeals/ip', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ip: data.ip,
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

<div class="relative flex min-h-screen flex-col items-center justify-center p-4">
	<BackgroundGradient />
	<FloatingParticles />

	<div class="relative z-10 mx-auto w-full max-w-2xl">
		<div
			class="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/90 to-black/90 p-8 shadow-xl backdrop-blur-sm"
		>
			<div class="mb-6 flex items-center gap-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
					<Shield class="h-6 w-6 text-red-400" />
				</div>
				<h1 class="text-2xl font-bold text-white">Your IP Address Has Been Blocked</h1>
			</div>

			<div class="mb-8 space-y-4">
				<div class="rounded-xl border border-red-500/20 bg-red-900/20 p-4">
					<div class="flex items-start gap-3">
						<AlertTriangle class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
						<div>
							<p class="font-medium text-red-300">Access Restricted</p>
							<p class="mt-1 text-sm text-red-200/80">
								Your IP address ({data.ip}) has been blocked from using our service.
							</p>
						</div>
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-gray-300">
						<span class="font-medium">Reason:</span>
						{data.blockInfo.reason}
					</p>
					<p class="text-gray-300">
						<span class="font-medium">Blocked on:</span>
						{new Date(data.blockInfo.blockedAt).toLocaleString()}
					</p>
					<p class="text-gray-300">
						<span class="font-medium">Block expires:</span>
						{expiryDate}
					</p>
				</div>

				<p class="text-sm text-gray-400">
					If you believe this block was applied in error, you can submit an appeal using the form
					below.
				</p>
			</div>

			{#if showAppealForm}
				<div class="space-y-4">
					<div>
						<label for="appeal-reason" class="mb-2 block text-sm font-medium text-white">
							Reason for Appeal
						</label>
						<Textarea
							id="appeal-reason"
							bind:value={appealReason}
							placeholder="Please explain why you believe this block was applied in error..."
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
				<Button
					onclick={() => (showAppealForm = true)}
					class="w-full bg-white/10 text-white hover:bg-white/20"
				>
					Submit Appeal
				</Button>
			{/if}
		</div>
	</div>
</div>
