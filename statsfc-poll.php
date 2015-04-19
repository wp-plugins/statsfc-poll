<?php
/*
Plugin Name: StatsFC Poll
Plugin URI: https://statsfc.com/docs/wordpress
Description: StatsFC Poll
Version: 1.0.2
Author: Will Woodward
Author URI: http://willjw.co.uk
License: GPL2
*/

/*  Copyright 2015  Will Woodward  (email : will@willjw.co.uk)

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License, version 2, as
    published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

define('STATSFC_POLL_ID',   'StatsFC_Poll');
define('STATSFC_POLL_NAME', 'StatsFC Poll');

/**
 * Adds widget
 */
class StatsFC_Poll extends WP_Widget
{
	public $isShortcode = false;

	private static $defaults = array(
		'title'       => '',
		'key'         => '',
		'question_id' => ''
	);

	/**
	 * Register widget with WordPress
	 */
	public function __construct()
	{
		parent::__construct(STATSFC_POLL_ID, STATSFC_POLL_NAME, array('description' => 'StatsFC Poll'));
	}

	/**
	 * Back-end widget form
	 *
	 * @see WP_Widget::form()
	 *
	 * @param array $instance Previously saved values from database
	 */
	public function form($instance)
	{
		$instance    = wp_parse_args((array) $instance, self::$defaults);
		$title       = strip_tags($instance['title']);
		$key         = strip_tags($instance['key']);
		$question_id = strip_tags($instance['question_id']);
		?>
		<p>
			<label>
				<?php _e('Title', STATSFC_POLL_ID); ?>:
				<input class="widefat" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
			</label>
		</p>
		<p>
			<label>
				<?php _e('Key', STATSFC_POLL_ID); ?>:
				<input class="widefat" name="<?php echo $this->get_field_name('key'); ?>" type="text" value="<?php echo esc_attr($key); ?>">
			</label>
		</p>
		<p>
			<label>
				<?php _e('Poll ID', STATSFC_POLL_ID); ?>:
				<input class="widefat" name="<?php echo $this->get_field_name('question_id'); ?>" type="text" value="<?php echo esc_attr($question_id); ?>">
			</label><br>
			Add a poll from your StatsFC account
		</p>
	<?php
	}

	/**
	 * Sanitize widget form values as they are saved
	 *
	 * @see WP_Widget::update()
	 *
	 * @param array $new_instance Values just sent to be saved
	 * @param array $old_instance Previously saved values from database
	 *
	 * @return array Updated safe values to be saved
	 */
	public function update($new_instance, $old_instance)
	{
		$instance                = $old_instance;
		$instance['title']       = strip_tags($new_instance['title']);
		$instance['key']         = strip_tags($new_instance['key']);
		$instance['question_id'] = strip_tags($new_instance['question_id']);

		return $instance;
	}

	/**
	 * Front-end display of widget
	 *
	 * @see WP_Widget::widget()
	 *
	 * @param array $args     Widget arguments
	 * @param array $instance Saved values from database
	 */
	public function widget($args, $instance)
	{
		extract($args);

		$title       = apply_filters('widget_title', $instance['title']);
		$key         = $instance['key'];
		$question_id = $instance['question_id'];

		$html  = $before_widget;
		$html .= $before_title . $title . $after_title;

		try {
			if (strlen($question_id) == 0) {
				throw new Exception('Please enter a question ID from the widget options');
			}

			$data = $this->_fetchData('https://api.statsfc.com/crowdscores/poll.php?key=' . urlencode($key) . '&question_id=' . urlencode($question_id));

			if (empty($data)) {
				throw new Exception('There was an error connecting to the StatsFC API');
			}

			$json = json_decode($data);

			if (isset($json->error)) {
				throw new Exception($json->error);
			}

			wp_register_style(STATSFC_POLL_ID . '-css', plugins_url('poll.css', __FILE__));
			wp_enqueue_style(STATSFC_POLL_ID . '-css');

			wp_register_script(STATSFC_POLL_ID . '-js', plugins_url('poll.js', __FILE__), array('jquery'));
			wp_enqueue_script(STATSFC_POLL_ID . '-js');

			$cookie_id = 'statsfc_poll_' . $key . '_' . $json->question->id;
			$cookie    = (isset($_COOKIE[$cookie_id]) ? $_COOKIE[$cookie_id] : null);

			$question = esc_attr($json->question->title);

			$html .= <<< HTML
			<div class="statsfc_poll" data-api-key="{$key}" data-question-id="{$question_id}">
				<table>
					<thead>
						<tr>
							<th colspan="3">{$question}</th>
						</tr>
					</thead>
					<tbody>
HTML;

			foreach ($json->answers as $answer) {
				$id          = esc_attr($answer->id);
				$class       = '';
				$radio       = '';
				$winner      = '';
				$description = esc_attr($answer->description);
				$votes       = '';
				$bar         = '';

				if (is_null($cookie)) {
					$radio = '<span class="statsfc_radio"><input type="radio" name="statsfc_poll_' . $question_id . '" value="' . $answer->id . '"></span>';
				} else {
					if ($json->question->mostVotes == $answer->votes) {
						$winner = 'statsfc_winner';
					}

					$votes = number_format($answer->votes);
					$width = 0;

					if ($json->question->mostVotes > 0) {
						$width = (100 / $json->question->mostVotes * $answer->votes);
					}

					$bar = '<span class="statsfc_votesBar" style="width: ' . $width . '%;"></span>';

					if ($cookie == $answer->id) {
						$class = 'statsfc_highlight';
					}
				}

				$html .= <<< HTML
				<tr data-answer-id="{$id}" class="{$class}">
					<td class="statsfc_answer">
						<label>
							{$radio}
							<span class="statsfc_description {$winner}">{$description}</span>
						</label>
					</td>
					<td class="statsfc_votes">{$votes}</td>
					<td class="statsfc_bar">{$bar}</td>
				</tr>
HTML;
			}

			$html .= <<< HTML
					</tbody>
				</table>
HTML;

			if (is_null($cookie)) {
				$html .= <<< HTML
				<p class="statsfc_submit">
					<input type="submit" value="Vote">
				</p>
HTML;
			}

			if ($customer->attribution) {
				$html .= <<< HTML
				<p class="statsfc_footer"><small>Powered by StatsFC.com</small></p>
HTML;
			}

			$html .= <<< HTML
			</div>
HTML;
		} catch (Exception $e) {
			$html .= '<p style="text-align: center;">StatsFC.com – ' . esc_attr($e->getMessage()) . '</p>' . PHP_EOL;
		}

		$html .= $after_widget;

		if ($this->isShortcode) {
			return $html;
		} else {
			echo $html;
		}
	}

	private function _fetchData($url) {
		$response = wp_remote_get($url);

		return wp_remote_retrieve_body($response);
	}

	public static function shortcode($atts) {
		$args = shortcode_atts(self::$defaults, $atts);

		$widget					= new self;
		$widget->isShortcode	= true;

		return $widget->widget(array(), $args);
	}
}

// Register widget
add_action('widgets_init', create_function('', 'register_widget("' . STATSFC_POLL_ID . '");'));
add_shortcode('statsfc-poll', STATSFC_POLL_ID . '::shortcode');
