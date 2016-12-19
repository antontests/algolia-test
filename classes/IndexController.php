<?php
use Framework\Component;

/**
 * Class Controller
 * The controller for the index route.
 */
class IndexController extends Component {
	/**
	 * Index action method to draw the interface.
	 * @method GET
	 * @pattern /
	 */
	public function actionIndex() {
		include(VIEWS_ROOT.'/index.phtml');
	}

	/**
	 * Test curl request to create an object.
	 * @method GET
	 * @pattern /test_create/
	 */
	public function actionTestCreate() {
		$data = [
			'objectID' => 'testobjid',
			'name' => 'smth added',
			'category' => 'NEW',
			'rank' => 100,
			'image' => '',
			'link' => 'http://google.com',
			'some' => '123123',
			'wild' => ['333222'],
			'attrs' => 1123112,
		];
		$data_json = json_encode($data);

		$ch = curl_init();

		curl_setopt($ch, CURLOPT_URL, $_SERVER['HTTP_HOST'].'/api/1/apps');
		curl_setopt($ch, CURLOPT_HTTPHEADER, [
			'Content-Type: application/json',
			'Accept: application/json',
		]);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data_json);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		echo curl_exec($ch);
		echo '<br/><br/>';
		echo '<pre>'.var_export(curl_getinfo($ch), true).'</pre>';

		curl_close($ch);
	}

	/**
	 * Test curl request to delete the created object.
	 * @method GET
	 * @pattern /test_delete/
	 */
	public function actionTestDelete() {
		$ch = curl_init();

		curl_setopt($ch, CURLOPT_URL, $_SERVER['HTTP_HOST'].'/api/1/apps/testobjid');
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
		curl_setopt($ch, CURLOPT_HTTPHEADER, [
			'Accept: text/plain',
		]);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		echo curl_exec($ch);
		echo '<br/><br/>';
		echo '<pre>'.var_export(curl_getinfo($ch), true).'</pre>';

		curl_close($ch);
	}
}