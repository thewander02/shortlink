<script lang="ts">
	import {
		ArrowLeft,
		ExternalLink,
		MousePointer,
		Users,
		Calendar,
		Copy,
		Check
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const shortCode = data.shortCode || '';

	let copied = $state(false);

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (e) {
			return dateString;
		}
	}
</script>

<div
	class="flex min-h-screen flex-col overflow-visible bg-gradient-to-br from-black via-gray-900 to-black text-white"
>
	<div class="absolute inset-0 z-0 overflow-hidden">
		<div class="absolute top-1/4 -left-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl"></div>
		<div class="absolute top-3/4 -right-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl"></div>
	</div>

	<main
		class="relative z-10 container mx-auto flex flex-1 flex-col items-center px-4 py-12 sm:py-16"
	>
		<div class="w-full max-w-4xl">
			<div class="mb-8 flex items-center justify-between">
				<a
					href="/history"
					class="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
				>
					<ArrowLeft class="h-4 w-4" aria-hidden="true" />
					Back to history
				</a>
			</div>

			{#if data.error || !data.analytics}
				<div
					class="rounded-2xl border border-red-500/20 bg-red-900/10 p-6 text-center backdrop-blur-md"
					role="alert"
				>
					<p class="text-red-300">{data.error || 'Analytics not found'}</p>
					<a
						href="/history"
						class="mt-4 inline-block rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/20"
					>
						Return to history
					</a>
				</div>
			{:else}
				<h1 class="mb-2 text-3xl font-light tracking-tight sm:text-4xl">Link Analytics</h1>
				<p class="mb-8 text-gray-400">Detailed statistics for your shortened link.</p>

				<div class="space-y-6">
					<!-- Stats Cards -->
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div
							class="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-black/80 p-6 backdrop-blur-md"
						>
							<div class="mb-2 flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
									<MousePointer class="h-5 w-5 text-blue-400" />
								</div>
								<div>
									<p class="text-2xl font-light text-white">{data.analytics.clicks}</p>
									<p class="text-xs text-gray-400">Total Clicks</p>
								</div>
							</div>
						</div>

						<div
							class="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-black/80 p-6 backdrop-blur-md"
						>
							<div class="mb-2 flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10"
								>
									<Users class="h-5 w-5 text-purple-400" />
								</div>
								<div>
									<p class="text-2xl font-light text-white">
										{data.analytics.uniqueVisitors || 0}
									</p>
									<p class="text-xs text-gray-400">Unique Visitors</p>
								</div>
							</div>
						</div>

						<div
							class="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-black/80 p-6 backdrop-blur-md"
						>
							<div class="mb-2 flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10"
								>
									<Calendar class="h-5 w-5 text-green-400" />
								</div>
								<div>
									<p class="text-sm font-light text-white">
										{formatDate(data.analytics.createdAt)}
									</p>
									<p class="text-xs text-gray-400">Created</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Link Details -->
					<div
						class="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-black/80 p-6 backdrop-blur-md"
					>
						<h2 class="mb-4 text-lg font-light text-white">Link Details</h2>
						<div class="space-y-4">
							<div>
								<p class="mb-1 text-xs text-gray-400">Original URL</p>
								<div class="flex items-center gap-2">
									<p class="flex-1 text-sm break-all text-white">{data.analytics.originalUrl}</p>
									<a
										href={data.analytics.originalUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-gray-400 transition-colors hover:text-white"
									>
										<ExternalLink class="h-4 w-4" />
									</a>
								</div>
							</div>

							<div>
								<p class="mb-1 text-xs text-gray-400">Short URL</p>
								<div class="flex items-center gap-2">
									<p class="flex-1 font-mono text-sm break-all text-white">
										{typeof window !== 'undefined' ? window.location.origin : ''}/{shortCode}
									</p>
									<button
										onclick={() =>
											copyToClipboard(
												`${typeof window !== 'undefined' ? window.location.origin : ''}/${shortCode}`
											)}
										class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/20"
										aria-label="Copy to clipboard"
									>
										{#if copied}
											<Check class="h-4 w-4" />
										{:else}
											<Copy class="h-4 w-4" />
										{/if}
									</button>
								</div>
							</div>

							{#if data.analytics.safetyScore !== undefined}
								<div>
									<p class="mb-1 text-xs text-gray-400">Safety Score</p>
									<p class="text-sm text-white">
										{data.analytics.safetyScore}/100
										{#if data.analytics.safetyCategory}
											<span class="text-gray-400"> - {data.analytics.safetyCategory}</span>
										{/if}
									</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>
