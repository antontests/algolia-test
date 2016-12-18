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
}