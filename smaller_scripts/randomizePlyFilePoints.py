# This script randomizes the order of points in a .ply file:
#     It opens the input PLY file and reads all lines into memory.
#     It divides the lines into header and body, based on the 'end_header' line in the PLY file.
#     It then shuffles the body lines, which correspond to the vertices of your model.
#     Finally, it writes the header and shuffled body lines to a new PLY file.
import random

def shuffle_ply_file(input_filename, output_filename):
    try:
        with open(input_filename, 'r') as f:
            lines = f.readlines()

        header = []
        body = []

        for line in lines:
            if line.startswith('element vertex'):
                num_vertices = int(line.split()[-1])
            if line.startswith('end_header'):
                header.append(line)
                break
            header.append(line)

        body = lines[len(header):]
        body = [body[n:n+1] for n in range(0, len(body), 1)]

        random.shuffle(body)

        with open(output_filename, 'w') as f:
            f.writelines(header)
            for chunk in body:
                f.writelines(chunk)

    except Exception as e: print(e)


shuffle_ply_file('timecube.ply', 'output.ply')

print('Type anything and press enter to exit') 
x = input()
print('Hello, ' + x) 
