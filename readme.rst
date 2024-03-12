usda-plant-hardiness
======================================================

This news app is built on our `interactive template <https://github.com/nprapps/interactive-template>`_. Check the readme for that template for more details about the structure and mechanics of the app, as well as how to start your own project.

Getting started
---------------

To run this project you will need:

* Node installed (preferably with NVM or another version manager)
* The Grunt CLI (install globally with ``npm i -g grunt-cli``)
* Git

With those installed, you can then set the project up using your terminal:

#. Pull the code - ``git clone git@github.com:nprapps/usda-plant-hardiness``
#. Enter the project folder - ``cd usda-plant-hardiness``
#. Install dependencies from NPM - ``npm install``
#. Start the server - ``grunt``

Running tasks
-------------

Like all interactive-template projects, this application uses the Grunt task runner to handle various build steps and deployment processes. To see all tasks available, run ``grunt --help``. ``grunt`` by itself will run the "default" task, which processes data and starts the development server. However, you can also specify a list of steps as arguments to Grunt, and it will run those in sequence. For example, you can just update the JavaScript and CSS assets in the build folder by using ``grunt bundle less``.

Common tasks that you may want to run include:

* ``sheets`` - updates local data from Google Sheets
* ``docs`` - updates local data from Google Docs
* ``sync`` - syncs files in ``src/assets/synced/`` (usually media files) to S3
* ``google-auth`` - authenticates your account against Google for private files
* ``static`` - rebuilds files but doesn't start the dev server
* ``cron`` - runs builds and deploys on a timer (see ``tasks/cron.js`` for details)
* ``publish`` - uploads files to the staging S3 bucket

  * ``publish:live`` uploads to production
  * ``publish:simulated`` does a dry run of uploaded files and their compressed sizes

You can also chain commands and pass flags for the deploy target:
* ``grunt sync docs sheets static publish`` - publish to stage
* ``grunt sync:live docs static publish:live`` - publish to production

Data sources
------------

Jupyter Notebook for processing PRISM minimum temperature data: https://github.com/nprapps/PRISM-min-temp

Useful conventions in the content doc
-------------------------------------

Most slides will be a single image and a single block of text, formatted like:

.. code::

 id: card-id
 image: filename.jpg
 constrain: contain
 align: right

 text::
 Text goes here
 ::text

 caption::
 Optional caption here
 ::caption

**To use the same image for a sequence of text blocks,** don't make multiple entries for the image. Instead rework the usual text section as a ``textBlocks`` element to loop thorugh.

.. code::

 id: card-id
 image: filename.jpg
 constrain: contain
 align: right
 textBlocks:
 [.textSections]

 text::
 First block of text goes here
 ::text

 text::
 Next block of text goes here.
 ::text

 text::
 Repeat as needed (though consider if you need this many)
 ::text

 []

**Anchoring an image's focal point**

When an image is set to ``contain``, it will by default keep the focus on the center of the image as the top or sides are cropped out of view. To shift that focall point, specify an ``anchor`` in the doc. For example:

.. code::

 image: 10_19_SPAIN-13.jpg
 constrain: contain
 anchor: 50% 20%

The first parameter is left/right, the second is top/bottom. (See `MDN documentation about object-fit <https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit>`_ for more.)

**Letterboxing images**

To letterbox an image on desktop and on mobile, add this param:

.. code::

  constrain: contain


To remove letterboxing, remove that param if it's there.

**Show two images side-by-side**

.. code::

  type: image
  diptych: Nepal-5.jpg, Nepal-6.jpg

Troubleshooting
---------------

**Fatal error: Port 35729 is already in use by another process.**

The live reload port is shared between this and other applications. If you're running another interactive-template project or Dailygraphics Next, they may collide. If that's the case, use ``--reload-port=XXXXX`` to set a different port for the live reload server. You can also specify a port for the webserver with ``--port=XXXX``, although the app will automatically find the first available port after 8000 for you.
