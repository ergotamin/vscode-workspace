<?php
	function verify_input () {
		$input = file_get_contents("php://input");

		if (strlen($input) > 0){
			$obj = json_decode($input);

			if (json_last_error() != JSON_ERROR_NONE) {
				exit("invalid JSON -> [ " . json_last_error_msg() . " ]");
			}

			if ( !$obj->data ) {
				exit("missing 'data' property.");
			}

			if ( strlen($obj->data) < 1) {
				exit("cannot proceed empty 'data' property.");
			}

			if ( strlen($obj->data) > 1048576 ) {
				exit("size of 'data' has to be lower or equal 1024KB.");
			}

			$_POST['data'] = $obj->data;

			if ( $obj->rounds && (int)$obj->rounds > 100 ) {
				exit("'rounds' has to be lower or equal 100.");
			}

			if ( $obj->rounds && (int)$obj->rounds > 0) {
				$_POST['rounds'] = (int)$obj->rounds;
			} else {
				$_POST['rounds'] = 30;
			}

			unset($obj);

			return true;
		}
		unset($input);
		return false;
	}
   if( verify_input() ) {
		$tmpf = tmpfile();
		fwrite($tmpf, $_POST['data']);
		$tmpp = stream_get_meta_data($tmpf)['uri'];
		$output = shell_exec(
			"cat " . $tmpp . " | ./obfuscate.js " . $_POST['rounds'] . ""
		);
 		fclose($tmpf);
		unset($tmpf);
		unset($tmpp);
		if ( strlen($output) > 0 ) {
		 echo $output;
		}
		exit();
   } ?>
<!doctype html>
<html>
	<head>
		<title>obfuscate-c</title>
	</head>
	<body>
		<h2><ul><strong>'obfuscate-c'</strong></ul></h2>
		<h3><ul>Description:</ul></h3>
		<p><ul>
		obfuscates a string on the serverside and then returns C sourcecode,<br/>
		with the obfuscated cstring and the sourcecode to transform it back.<br/>
		submitted data is not stored on the server !<br/>
		the process may fail if your data exceeeds the limits:<br/>
		<ul>
				=> max. size   <= 1024 KB<br/>
				=> max. rounds <= 100    <br/>
		</ul>
		</ul></p>
		<br/>
		<h3><ul>Usage:</ul></h3>
		<p><ul><em>
		curl -d "@example.json" \<br/>
		-H "Content-Type: application/json"<br/>
		-X POST http://metasrc.tk/obfuscate_c.php<br/>
		</em></ul></p>
		<br/><br/>
		<p><ul>
		contents of "example.json":
		</ul></p><br/>
		<ul><code>
		{
			"data": "This is just an example String!",
			"rounds": 30
		}
		</code></ul>
		<p><ul>
		"rounds" can be omitted, it defaults to "30".<br/>
		"data" is required and the submitted file has to be<br/>
		valid JSON. (process fails, if its not!)<br/>
		</p></ul>
</body>
</html>
<?php
		exit();
?>
