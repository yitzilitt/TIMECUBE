# TIMECUBE
TIMECUBE is a tool for visualising [spacetime](https://en.wikipedia.org/wiki/Spacetime) from a new angle.

![image](https://github.com/yitzilitt/TIMECUBE/assets/28551587/d8c8f518-1b47-4f67-9999-8a0caa38de6d)

## About
The TIMECUBE is intended for artists, philosophers, scientists, film editors, and those who wish to [defamiliarize](https://en.wikipedia.org/wiki/Defamiliarization) themselves with the peculiar [dimensionality](https://en.wikipedia.org/wiki/Curse_of_dimensionality) of our universe.

Video inputs are TIMECUBIFIED into a 3-dimensional point cloud which allows the pixel/color data of the entire video to be viewed at once. The cloud (or TIMECUBE) can also be "sliced" (via TIMEKNIVES) to view and output 2D cross-sections of the TIMECUBE, which can be used to create videos giving an entirely alien perspective of the world.

![ezgif com-optimize](https://github.com/yitzilitt/TIMECUBE/assets/28551587/d3e279f6-fe75-4d8b-98a9-4c5602cacd98)

_**Note: The TIMECUBE software is not yet complete, and may be difficult to set up on your computer at present. For now, you can explore a 'lite' version online, at [timecube.vercel.app](https://timecube.vercel.app/). Stay tuned as this project develops!**_

## Features
* Explore a collection of pre-existing TIMECUBEs, or import your own!
  * Currently supports `.ply` and `.timecube` file formats
  * COMING SOON: Convert .mp4 videos into `.timecube` or `.ply` files, allowing you to manipulate your TIMECUBE with other 3D-editing software, like MeshLab or Blender.
* Control the way your TIMECUBE is visualized in the 3D editor, including transparency filtering, point size, and other effects.
* Software design inspired by the aesthetics of the early internet, and [Nathalie Lawhead's](https://en.wikipedia.org/wiki/Nathalie_Lawhead) incredible artistic oeuvre. (Go ahead and [check out their work!!!!!](http://www.nathalielawhead.com/candybox/))
* Slice your TIMECUBE with a buttery-smooth TIMEKNIFE to explore its interior volume [and COMING SOON, export the resulting cross-sections as high(ish) resolution sharable images, or video animations]!
* Secrets ;-)
* ...
* [More features may be added as the project develops]

![image](https://github.com/yitzilitt/TIMECUBE/assets/28551587/8771885f-6fa2-432a-91f4-222e16418b15)

## Explanation
### Intorduction
Imagine a typical video. Or don't. That's also fine. Here, I'll do the work for you:

![man walking tree bench](https://github.com/yitzilitt/TIMECUBE/assets/28551587/d09146f2-ecdd-423d-8dcf-0406fab99d04)

In this video, we see a man walk from left to right, go behind a tree, and sit down on a bench. The camera, and the scene as a whole, is pretty static. In fact, *nothing* in this scene is actually moving. Nothing ever truly is on film. In reality, we are simply watching a rapid sequence of still pictures, which when played quickly enough (in this case, 10 frames per second), causes our brain to percieve motion. In a traditional film reel, these pictures are physically connected, one next to the other, and are rapidly moved across a projector:

![timecube example vid film strip (Small)](https://github.com/yitzilitt/TIMECUBE/assets/28551587/aeeb7dff-180b-4267-bde3-2169eb98838c)

Congrats! You have now visualized the same event in two different ways: once as a series of still images, seperated by time (aka a "normal" video), and once as a series of still images, seperated by vertical or horizontal space (aka a film strip). No data is lost in converting from one visualization to the other, and both can be helpful in different ways. Videos are useful when trying to "spot the difference" from one frame to the next, while looking at still frames from a video can be helpful in distinguishing details which might otherwise be lost in a blur of motion.

This is how we normally visualize events, but there are other ways to percieve the world as well.

In order to create the TIMECUBE, instead of displaying the frames of a video as seperated in time, or along the vertical/horizontal dimension, we display our frames *on top of* each other, forming a "loaf," or cubic 3D shape. At the side of our TIMECUBE closest to us, we see the first frame, directly behind that is the second frame, and so on, with the final frame of the original video displayed at the far end:

![image](https://github.com/yitzilitt/TIMECUBE/assets/28551587/ed576eca-92fd-45f3-9e89-b7c5e5a6ca1a)

(In the above visualization I have removed the lighter pixels from the scene, to make it easier to see the depth of the TIMECUBE.)

### The TIMEKNIFE
An individual frame of a given video is effectivly a cross-section of that video's TIMECUBE. To retrieve a frame, we simply SLICE the TIMECUBE with a plane at the proper angle, and "paint" the plane (or TIMEKNIFE) with the nearest pixel values:

![image](https://github.com/yitzilitt/TIMECUBE/assets/28551587/2937dbbd-609e-464f-81d8-b539d6d10a62)

If we want to recreate our original video, we can simply slide the TIMEKNIFE back and forth, and record the output:

![ezgif com-video-to-gif(4)](https://github.com/yitzilitt/TIMECUBE/assets/28551587/50c4ec2f-5522-4eda-ad7c-81a375dae802)


But that isn't the only way we can use our TIMEKNIFE. The nice thing about slicing things is that with enough determination, you can slice along any angle that you want! For example...

![ezgif com-video-to-gif(2)](https://github.com/yitzilitt/TIMECUBE/assets/28551587/9f6f8fe5-79dc-4d2a-8b75-b4c897ae4276)

![ezgif com-video-to-gif(3)](https://github.com/yitzilitt/TIMECUBE/assets/28551587/8c4d039b-2b01-48ad-9c74-0769f0777c8d)

By specifying the start and end position of the TIMEKNIFE plane, you can create a video animation, and export it as an .mp4 file. [FEATURE NOT YET PUBLICLY AVAILABLE]

## Use Cases

The sky is the limit! :)

