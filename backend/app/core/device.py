from dataclasses import dataclass

import torch


@dataclass
class HardwareProfile:

    device: str

    compute_type: str

    accelerator: str

    gpu_name: str


def get_hardware_profile() -> HardwareProfile:

    if torch.cuda.is_available():

        return HardwareProfile(

            device="cuda",

            compute_type="float16",

            accelerator="CUDA",

            gpu_name=torch.cuda.get_device_name(0)

        )

    if hasattr(torch.backends, "mps"):

        if torch.backends.mps.is_available():

            return HardwareProfile(

                device="mps",

                compute_type="float16",

                accelerator="Apple Metal",

                gpu_name="Apple Silicon"

            )

    return HardwareProfile(

        device="cpu",

        compute_type="int8",

        accelerator="CPU",

        gpu_name="CPU"

    )


hardware = get_hardware_profile()
