Feature: Callouts

  Background:
    Given I am on "http://learn.code.org/reset_session"
    And execute JavaScript expression "window.localStorage.clear()"

  Scenario Outline: Callouts having correct content and being dismissable via the target element
    Given I am on "<url>"
    And I rotate to landscape
    And I press "x-close"
    And callout "<callout_id>" is visible
    And callout "<callout_id>" has text: <text>
    And I click selector "<close_target>"
    And callout "<callout_id>" is hidden
  Examples:
    | url                                                | callout_id | text                                                                     | close_target      |
    | http://learn.code.org/s/20-hour/stage/2/puzzle/1?noautoplay=true  | 1          | Hit "Run" to try your program                                            | #runButton        |
    | http://learn.code.org/hoc/1?noautoplay=true        | 1          | Hit "Run" to try your program                                            | #runButton        |
    | http://learn.code.org/hoc/1?noautoplay=true        | 0          | Drag a "move" block and snap it below the other block                    | [block-id='1']    |
    | http://learn.code.org/s/20-hour/stage/2/puzzle/9?noautoplay=true | 0          | Blocks that are grey can't be deleted. Can you solve the puzzle anyway?  | g                 |
    | http://learn.code.org/hoc/9?noautoplay=true        | 0          | Blocks that are grey can't be deleted. Can you solve the puzzle anyway?  | g                 |
    | http://learn.code.org/s/20-hour/stage/2/puzzle/14?noautoplay=true | 0          | Click here to see the code for the program you're making                 | #show-code-header |
    | http://learn.code.org/hoc/14?noautoplay=true       | 0          | Click here to see the code for the program you're making                 | #show-code-header |
    | http://learn.code.org/s/20-hour/stage/2/puzzle/15?noautoplay=true | 0          | The instructions for each puzzle are repeated here                       | #prompt           |
    | http://learn.code.org/hoc/15?noautoplay=true       | 0          | The instructions for each puzzle are repeated here                       | #prompt           |
    | http://learn.code.org/s/20-hour/stage/11/puzzle/1?noautoplay=true | 0          | You have all the same blocks but they've now been arranged in categories | .blocklyTreeLabel |

  # See #101702822. "Watch video" section inaccessible from iPhone.
  @no_mobile
  Scenario Outline: Callouts having correct content and being dismissable via the x-button
    Given I am on "<url>"
    And I rotate to landscape
    And I close the dialog
    And callout "<callout_id>" is visible
    And callout "<callout_id>" has text: <text>
    And I close callout "<callout_id>"
    And callout "<callout_id>" is hidden
  Examples:
    | url                                                | callout_id | text                                                                             | close_target           |
    | http://learn.code.org/s/20-hour/stage/2/puzzle/6?noautoplay=true  | 0          | Click here to watch the video again                                              | #thumbnail_mgooqyWMTxk |
    | http://learn.code.org/hoc/6?noautoplay=true        | 0          | Click here to watch the video again                                              | #thumbnail_mgooqyWMTxk |

  Scenario: Modal ordering
    Given I am on "http://learn.code.org/s/20-hour/stage/2/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And callout "0" is visible
    And ".modal-backdrop" should be in front of "#qtip-0"
    And I press "x-close"

  Scenario: Closing using "x" button
    Given I am on "http://learn.code.org/s/20-hour/stage/2/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And I close the dialog
    And element ".tooltip-x-close" is visible
    And callout "0" is visible
    And callout "1" is visible
    And I close callout "1"
    And callout "0" is visible
    And callout "1" is hidden
    And I close callout "0"
    And callout "0" is hidden

  Scenario: Only showing seen callouts once
    Given I am on "http://learn.code.org/s/20-hour/stage/2/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And I press "x-close"
    And callout "0" exists
    Given I am on "http://learn.code.org/s/20-hour/stage/2/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And I press "x-close"
    And callout "0" does not exist

  # Show Code button is hidden on small screens.
  @no_mobile
  Scenario: Opening the Show Code dialog
    Given I am on "http://learn.code.org/s/20-hour/stage/2/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And I close the dialog
    When I press "show-code-header"
    Then ".modal-backdrop" should be in front of "#qtip-0"
