<script lang="ts">
	import { onMount } from 'svelte';
	import { Copy, Check, Key, SaveIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import { getUserIdFromStorage, setUserIdInStorage, isValidUUID } from '$lib/utils/user-id';

	let userId = $state<string>('');
	let copied = $state(false);
	let isSetting = $state(false);
	let showInput = $state(false);
	let inputValue = $state('');

	onMount(async () => {
		const stored = getUserIdFromStorage();
		if (stored) {
			userId = stored;
		} else {
			try {
				const response = await fetch('/api/user-id');
				if (response.ok) {
					const data = await response.json();
					if (data.userId) {
						userId = data.userId;
						setUserIdInStorage(data.userId);
					}
				}
			} catch (error) {
				console.error('Error fetching user ID:', error);
			}
		}
	});

	async function copyUserId() {
		if (!userId) return;
		try {
			await navigator.clipboard.writeText(userId);
			copied = true;
			toast.success('User ID copied', {
				description: 'You can paste this on another device to sync your history'
			});
			setTimeout(() => (copied = false), 2000);
		} catch (error) {
			toast.error('Failed to copy', {
				description: 'Unable to copy user ID. Please try again'
			});
		}
	}

	async function setUserId() {
		if (!inputValue.trim()) {
			toast.error('User ID required', {
				description: 'Please enter a user ID to sync your history'
			});
			return;
		}

		if (!isValidUUID(inputValue.trim())) {
			toast.error('Invalid user ID format', {
				description: 'Please enter a valid UUID'
			});
			return;
		}

		isSetting = true;
		try {
			const response = await fetch('/api/user-id', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: inputValue.trim() })
			});

			if (response.ok) {
				userId = inputValue.trim();
				setUserIdInStorage(userId);
				showInput = false;
				inputValue = '';
				toast.success('User ID set', {
					description: 'Your history will now sync with this device'
				});
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				const data = await response.json();
				toast.error('Failed to set user ID', {
					description: data.error || 'Please try again'
				});
			}
		} catch (error) {
			toast.error('Failed to set user ID', {
				description: 'Please try again'
			});
		} finally {
			isSetting = false;
		}
	}

	function generateNewId() {
		const newId = crypto.randomUUID();
		inputValue = newId;
		showInput = true;
	}
</script>

<div
	class="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-black/80 p-4 backdrop-blur-md"
>
	<div class="mb-3 flex items-center gap-3">
		<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
			<Key class="h-4 w-4 text-blue-400" />
		</div>
		<div class="flex-1">
			<h3 class="text-sm font-medium text-white">Your User ID</h3>
			<p class="text-xs text-gray-400">Copy this to sync your history across devices</p>
		</div>
	</div>

	{#if userId}
		<div class="mb-3 flex items-center gap-2">
			<Input
				type="text"
				value={userId}
				readonly
				class="flex-1 border-white/10 bg-black/30 font-mono text-xs text-gray-300"
			/>
			<Button
				onclick={copyUserId}
				class="h-9 bg-white/10 px-3 text-white hover:bg-white/20"
				aria-label="Copy user ID"
			>
				{#if copied}
					<Check class="h-4 w-4" />
				{:else}
					<Copy class="h-4 w-4" />
				{/if}
			</Button>
			<Button
				onclick={() => (showInput = true)}
				class="h-9 bg-white/10 text-xs text-white hover:bg-white/20"
			>
				<SaveIcon class="h-4 w-4" />
			</Button>
		</div>
	{/if}

	{#if showInput}
		<div class="mb-3 space-y-2">
			<Input
				type="text"
				bind:value={inputValue}
				placeholder="Paste your user ID here"
				class="border-white/10 bg-black/30 font-mono text-xs"
			/>
			<div class="flex gap-2">
				<Button
					onclick={setUserId}
					disabled={isSetting}
					class="h-9 flex-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
				>
					{isSetting ? 'Setting...' : 'Set User ID'}
				</Button>
				<Button
					onclick={() => {
						showInput = false;
						inputValue = '';
					}}
					class="h-9 bg-white/10 px-3 text-white hover:bg-white/20"
				>
					Cancel
				</Button>
			</div>
		</div>
	{/if}
</div>
