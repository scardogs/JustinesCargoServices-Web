import { Box } from "@chakra-ui/react";

export const Component1 = ({ passText }) => {
  return (
    <>
      <Box background={"red"} color="white">
        {passText}
      </Box>
    </>
  );
};
