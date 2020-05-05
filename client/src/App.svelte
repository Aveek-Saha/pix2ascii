<script>
	let files, width, chars
	
	function sendForm() {
		console.log(files[0], width, chars);
		var formData = new FormData();

		formData.append("image", files[0]);
		formData.append("width", width);
		formData.append("charset", chars);

		var request = new XMLHttpRequest();
		request.open("POST", "http://localhost:5001/pix2ascii/us-central1/ascii");
		request.send(formData);
		request.onreadystatechange = function () {
		if(request.readyState === XMLHttpRequest.DONE) {
			var status = request.status;
			if (status === 0 || (status >= 200 && status < 400)) {
			console.log(request.responseText);
			} else {
			console.log("Error");
			
			}
		}
		};
		
	}
</script>

<div class="terminal-nav">
	<div class="terminal-logo">
	<!-- <h1> -->
		<div class="logo terminal-prompt"><a href="/" class="no-style">Pix 2 Ascii</a></div>
	<!-- </h1> -->
	</div>
	<!-- <nav class="terminal-menu">
	<ul>
		<li><a class="menu-item" href="#">Item #1</a></li>
		<li><a class="menu-item active" href="#">Active Item #2</a></li>
		<li><a class="menu-item" href="#">Item #3</a></li>
	</ul>
	</nav> -->
</div>

<div class="container">
	
	<div class="row">
		<div class="column column-40 column-offset-10">
			<!-- <form> -->
				<fieldset>
				<legend>Upload Image</legend>
				<div class="form-group">
					<label for="file">Pick an image:</label>
					<input id="file" name="file" bind:files={files} type="file">
				</div>
				<div class="form-group">
					<label for="width">Number of characters in a row:</label>
					<input id="width" name="width" type="number" bind:value={width}
					min="100" max="500" placeholder="Range: 100 - 500">
				</div>
				<div class="form-group">
					<label for="select">Characterset: </label>
					<select id="select" name="select" bind:value={chars} >
					<option value="gscale_70"> Grayscale 70 </option>
					<option value="gscale_10"> Grayscale 10 </option>
					<option value="gscale_block"> Blocks </option>

					</select>
				</div>
				{#if files!== undefined && width < 501 && width > 99 && chars!== ""}
					<button class="btn btn-primary"
					on:click={sendForm}>Generate</button>
				{:else}
					<button class="btn btn-error btn-ghost" disabled>Generate</button>
				{/if}

					
				</fieldset>
			<!-- </form> -->
		</div>
		<div class="column column-40">
			<form>
				<fieldset>
				<legend>ASCII Art</legend>
				</fieldset>
			</form>
		</div>
	</div>

</div>


<!-- <div class="row end-lg end-m end-s">
    
</div> -->

<style>
</style>