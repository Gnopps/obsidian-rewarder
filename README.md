## Obsidian Rewarder

### Intro

This is a plugin to reward yourself when you complete tasks. Rewards can be given for every task or at random intervals. Given rewards can be stored in your daily note.

![Example of completing a task](https://raw.githubusercontent.com/Gnopps/obsidian-rewarder/master/Example.gif)

### Getting started

1. List your available rewards. Do this with one reward per row in a separate file. By default the file name is "Rewards.md", but this can be changed to any file in the settings. If you want to get started quickly you can run the command _Create sample rewards note_ to create an example rewards file.

Example file content:

> -   Have a cup of tea
> -   Watch an episode of favourite series {rare} {20}
> -   Knit for 15 minutes {rare}
> -   Open the birthday present champagne bottle {legendary} {1}

2. Complete a task by clicking its checkbox. Obsidian Rewarder will now randomly determine if you should get a reward and if so, which. You'll be notified with a message in Obsidian.

### Configurating rewards

Each reward has two optional settings:

-   _Occurence_: This defines how often a reward should occur. You may want the reward "Eat candy" to occur more often than "Buy a bottle of champagne". There are three different occurence-levels, by default these are
    -   common
    -   rare
    -   legendary  
        In the settings it possible to change both the name and chance of each occurence. Rewards with no occurence specified will default to "common".
-   _Inventory_: This defines how many items of each rewards are available. If you have a "Eat candy"-reward but only have 5 candies, then you may want to set the maximum number this reward can occur to 5. Every time this reward is given the inventory will automatically be substracted by 1 in the rewards-file. Once 0 is reached, this reward will no longer be given. If not specified, this defaults to unlimited.

Reward settings are inserted by adding a number and/or occurence within double-brackets on the same row as the reward. If you prefer, double-brackets can be replcaed with something else in settings. Examples:

> Eat candy

The above reward will be common and never run out

> Eat cake {4}

The above reward will be common and run out once it has been awarded 4 times

> Have a nap {rare}

The above reward will occur rarely but will never run out

> Have a beer {rare} {5}

The above reward will occur rarely and will run out once it has been awarded 5 times

### Settings

The following configuration options are possible

#### Functionality settings

-   _File with rewards_: The file (including folder if applicable) where the rewards are stored. Defaults to "Rewards.md".
-   _Show popup when reward is awarded_: If activated a popup (modal) will be shown when a reward is awarded, you'll need to close this before you can continue your work. If deactivated only a timed notice will be shown.
-   _Save rewards in daily note_: When active will amend any rewards received to the end of your daily note, one row per awarded reward.
-   _Use with quotes instead of rewards_: Activate this if you are working with inspirational quotes instead of rewards. When active, your rewards are showing without any congratulations or other added text.

#### Reward settings

-   _Occurence values_: Defines the chance of a reward with the occurence to be given. A setting of "20" means that on average, this reward occurence will be given 20% of the time a task is completed. The chance that _any_ reward is given is the sum of the three values given here.
-   _Occurence labels_: Allows you to rename the default occurence names.

#### Special characters settings

-   _Start/End of metadata_: Allows you to define between what characters your rewards have the data of occurence and inventory. Defaults to "{" and "}".

### Commands

-   _Create sample rewards note_: This will create a file called "Rewards.md" with example rewards.
