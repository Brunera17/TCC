import os
import fileinput
import sys

def fix_imports(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with fileinput.FileInput(filepath, inplace=True, backup='.bak') as file:
                        for line in file:
                            # Substitui 'from backend.' por 'from '
                            print(line.replace('from backend.', 'from '), end='')
                    print(f'Fixed imports in {filepath}')