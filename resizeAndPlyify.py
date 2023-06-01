import cv2
import numpy as np

def resize_video(input_video, output_video, target_height, target_frames, cut_first_frames=0, cut_last_frames=0):
    # Open the input video
    cap = cv2.VideoCapture(input_video)

    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Calculate the new width while preserving the aspect ratio
    new_width = int(target_height * (width / height))

    # Update the total number of frames after cutting
    total_frames = total_frames - cut_first_frames - cut_last_frames

    # Calculate the frame indices to keep for the target number of frames
    frame_indices = np.linspace(cut_first_frames, total_frames - 1, num=target_frames, dtype=int)

    # Define the codec and create a VideoWriter object
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video, fourcc, fps, (new_width, target_height))

    # Loop through the video, resize the frames and write to output video
    current_frame = 0
    for frame_idx in frame_indices:
        while current_frame <= frame_idx:
            ret, frame = cap.read()
            if not ret:
                break
            current_frame += 1

        if ret:
            # Resize the frame and write it to output video
            resized_frame = cv2.resize(frame, (new_width, target_height))
            out.write(resized_frame)

    # Release resources
    cap.release()
    out.release()
    cv2.destroyAllWindows()

def save_as_ply_file(points, colors, output_path):
    with open(output_path, 'w') as f:
        f.write('ply\n')
        f.write('format ascii 1.0\n')
        f.write('element vertex {}\n'.format(len(points)))
        f.write('property float x\n')
        f.write('property float y\n')
        f.write('property float z\n')
        f.write('property uchar red\n')
        f.write('property uchar green\n')
        f.write('property uchar blue\n')
        f.write('end_header\n')

        for p, color in zip(points, colors):
            f.write('{} {} {} {} {} {}\n'.format(p[0], p[1], p[2], color[0], color[1], color[2]))

def video_to_voxels(video_path, voxel_size=1.0):
    # Read video
    video = cv2.VideoCapture(video_path)
    frame_count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Initialize an empty list for points and colors
    points = []
    colors = []

    for frame_index in range(frame_count):
        ret, frame = video.read()
        if not ret:
            break

        # Find all pixels
        y, x = np.mgrid[:frame_height, :frame_width]
        z = np.full_like(x, -frame_index)
        points.extend(np.column_stack((x.ravel(), y.ravel(), z.ravel())))

        # Get color information for each point and store it
        color = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        color = color.reshape(-1, 3)
        colors.extend(color)

    # Save as a PLY file.
    output_video = video_path + ".ply"
    save_as_ply_file(points, colors, output_video)

    # Release video capture object
    video.release()


def convert_video(input_video):
    # Setup parameters
    target_height = 100
    target_frames = 100
    cut_first_frames = 0
    cut_last_frames = 0

    # Resize the video
    output_video = "TINY " + input_video
    resize_video(input_video, output_video, target_height, target_frames, cut_first_frames, cut_last_frames)
    
    # Convert the video to voxels and save as a .ply file
    video_to_voxels(output_video)


convert_video('example.mp4')
