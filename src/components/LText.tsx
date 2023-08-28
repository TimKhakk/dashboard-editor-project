import Konva from "konva";
import React, { ComponentProps } from "react";
import { Text, Transformer } from "react-konva";

const LText = ({
  isSelected,
  onSelect,
  onChange,
  ...restProps
}: ComponentProps<typeof Text> & {
  isSelected: boolean;
  onSelect: VoidFunction;
  onChange: (starProps: ComponentProps<typeof Text>) => void;
}) => {
  const textRef = React.useRef<Konva.Text>(null);
  const trRef = React.useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    if (isSelected) {
      // we need to attach transformer manually
      trRef.current!.nodes([textRef.current!]);
      trRef.current!.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Text
        ref={textRef}
        fontSize={18}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        {...restProps}
        onDragEnd={(e) => {
          onChange({
            ...restProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = textRef.current!;

          onChange({
            ...restProps,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          resizeEnabled={false}
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

export default LText;
