package com.observability.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Trace {
    private String traceId;
    private long startTime;
    private long endTime;
    private long duration;
    private String serviceName;
    @Builder.Default
    private List<Span> spans = new ArrayList<>();
}
