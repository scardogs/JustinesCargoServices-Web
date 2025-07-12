import { Component1 } from "@/components/Component1";
import { Box, Button, Input, Text } from "@chakra-ui/react";
import { useState } from "react";

const Test = () => {
  const [text, setText] = useState();

  return (
    <>
      <Input
        type="text"
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <Text>{text}</Text>

      <Component1 passText={text} />
    </>
  );
};

export default Test;
